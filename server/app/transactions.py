"""
transactions.py — Escrow transaction lifecycle + chat.

Endpoints:
  POST  /api/transactions                        — create transaction from a link (buyer)
  GET   /api/transactions                        — list transactions (role-filtered)
  GET   /api/transactions/<id>                   — get single transaction
  POST  /api/transactions/<id>/deliver           — mark delivered + upload proof (seller)
  POST  /api/transactions/<id>/confirm           — confirm receipt, release funds (buyer)
  POST  /api/transactions/<id>/dispute           — raise a dispute (buyer)
  POST  /api/transactions/<id>/cancel            — cancel a PENDING transaction
  GET   /api/transactions/<id>/messages          — get chat messages
  POST  /api/transactions/<id>/messages          — send a chat message
"""

import os
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app.models import db, User, Transaction, PaymentLink, Message
from app.sms import notify

tx_bp    = Blueprint('transactions', __name__)
BASE_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
FEE_PCT  = float(os.getenv('PLATFORM_FEE_PERCENT', '2.5'))


def _err(msg, code=400):
    return jsonify({'error': msg}), code

def _get_user():
    return User.query.get(get_jwt_identity())


# ── create ────────────────────────────────────────────────────────────────────

@tx_bp.post('')
@jwt_required()
def create_transaction():
    buyer = _get_user()
    d     = request.get_json() or {}

    link_id = d.get('link_id')
    if not link_id:
        return _err('link_id is required')

    link = PaymentLink.query.get(link_id)
    if not link or not link.is_active:
        return _err('Payment link not found or inactive', 404)

    if link.seller_id == buyer.id:
        return _err('You cannot pay your own link', 400)

    amount = float(d.get('amount') or link.amount or 0)
    if amount <= 0:
        return _err('Invalid amount')
    if link.min_amount and amount < link.min_amount:
        return _err(f'Minimum amount is KES {link.min_amount:,.0f}')
    if link.max_amount and amount > link.max_amount:
        return _err(f'Maximum amount is KES {link.max_amount:,.0f}')

    fee      = round(amount * FEE_PCT / 100)
    receives = amount - fee

    tx = Transaction(
        link_id         = link.id,
        buyer_id        = buyer.id,
        seller_id       = link.seller_id,
        title           = link.title,
        description     = link.description,
        amount          = amount,
        platform_fee    = fee,
        seller_receives = receives,
        status          = 'PENDING',
        expires_at      = datetime.utcnow() + timedelta(days=3),  # auto-cancel if unpaid
    )
    db.session.add(tx)
    db.session.commit()
    return jsonify(tx.to_dict()), 201


# ── list ──────────────────────────────────────────────────────────────────────

@tx_bp.get('')
@jwt_required()
def list_transactions():
    u      = _get_user()
    role   = request.args.get('role', 'all')
    status = request.args.get('status')

    q = Transaction.query
    if u.role == 'admin':
        pass  # admins see everything — use /api/admin/transactions instead
    elif role == 'buyer':
        q = q.filter_by(buyer_id=u.id)
    elif role == 'seller':
        q = q.filter_by(seller_id=u.id)
    else:
        q = q.filter(or_(Transaction.buyer_id == u.id, Transaction.seller_id == u.id))

    if status:
        q = q.filter_by(status=status)

    txs = q.order_by(Transaction.created_at.desc()).all()
    return jsonify([t.to_dict() for t in txs])


# ── get single ────────────────────────────────────────────────────────────────

@tx_bp.get('/<tx_id>')
@jwt_required()
def get_transaction(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)
    if u.role != 'admin' and tx.buyer_id != u.id and tx.seller_id != u.id:
        return _err('Forbidden', 403)
    return jsonify(tx.to_dict())


# ── mark delivered (seller) ───────────────────────────────────────────────────

@tx_bp.post('/<tx_id>/deliver')
@jwt_required()
def deliver(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)

    if tx.seller_id != u.id:
        return _err('Forbidden', 403)
    if tx.status != 'FUNDED':
        return _err('Transaction must be FUNDED before marking delivered')

    d = request.get_json() or {}
    tx.status              = 'DELIVERED'
    tx.delivered_at        = datetime.utcnow()
    tx.delivery_notes      = d.get('notes')
    tx.delivery_proof_url  = d.get('proof_url')
    db.session.commit()

    notify('delivered', tx.buyer.phone or '',
           buyer_name=tx.buyer.full_name, seller_name=tx.seller.full_name,
           title=tx.title, url=f"{BASE_URL}/track/{tx.reference}")

    return jsonify(tx.to_dict())


# ── confirm receipt (buyer) ───────────────────────────────────────────────────

@tx_bp.post('/<tx_id>/confirm')
@jwt_required()
def confirm(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)

    if tx.buyer_id != u.id:
        return _err('Forbidden', 403)
    if tx.status not in ('FUNDED', 'DELIVERED'):
        return _err('Cannot confirm at this stage')

    tx.status       = 'COMPLETED'
    tx.completed_at = datetime.utcnow()

    # Update seller reputation stats
    tx.seller.total_completed += 1
    tx.seller.total_gmv       += tx.amount
    db.session.commit()

    notify('completed', tx.seller.phone or '',
           seller_name=tx.seller.full_name,
           amount=f"{tx.seller_receives:,.0f}",
           reference=tx.reference)

    return jsonify(tx.to_dict())


# ── raise dispute (buyer) ─────────────────────────────────────────────────────

@tx_bp.post('/<tx_id>/dispute')
@jwt_required()
def dispute(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)

    if tx.buyer_id != u.id:
        return _err('Forbidden', 403)
    if tx.status not in ('FUNDED', 'DELIVERED'):
        return _err('Cannot raise a dispute at this stage')

    d = request.get_json() or {}
    if not d.get('reason'):
        return _err('A reason is required')

    tx.status         = 'DISPUTED'
    tx.dispute_reason = d['reason'].strip()
    db.session.commit()

    notify('disputed', tx.seller.phone or '',
           seller_name=tx.seller.full_name,
           title=tx.title, reference=tx.reference)

    return jsonify(tx.to_dict())


# ── cancel ────────────────────────────────────────────────────────────────────

@tx_bp.post('/<tx_id>/cancel')
@jwt_required()
def cancel(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)

    if u.role != 'admin' and tx.buyer_id != u.id and tx.seller_id != u.id:
        return _err('Forbidden', 403)
    if tx.status != 'PENDING':
        return _err('Only PENDING transactions can be cancelled')

    tx.status = 'CANCELLED'
    db.session.commit()
    return jsonify(tx.to_dict())


# ── chat: get messages ────────────────────────────────────────────────────────

@tx_bp.get('/<tx_id>/messages')
@jwt_required()
def get_messages(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)

    if u.role != 'admin' and tx.buyer_id != u.id and tx.seller_id != u.id:
        return _err('Forbidden', 403)

    msgs = tx.messages.order_by(Message.created_at.asc()).all()
    return jsonify([m.to_dict() for m in msgs])


# ── chat: send message ────────────────────────────────────────────────────────

@tx_bp.post('/<tx_id>/messages')
@jwt_required()
def send_message(tx_id):
    u  = _get_user()
    tx = Transaction.query.get_or_404(tx_id)

    if u.role != 'admin' and tx.buyer_id != u.id and tx.seller_id != u.id:
        return _err('Forbidden', 403)

    d = request.get_json() or {}
    if not d.get('body'):
        return _err('Message body is required')

    m = Message(
        transaction_id = tx_id,
        sender_id      = u.id,
        body           = d['body'].strip(),
        file_url       = d.get('file_url'),
    )
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201


# ── get transaction by reference (buyer tracking) ─────────────────────────────

@tx_bp.get('/ref/<reference>')
@jwt_required()
def get_by_reference(reference):
    u  = _get_user()
    tx = Transaction.query.filter_by(reference=reference).first()
    if not tx:
        return _err('Transaction not found', 404)
    if u.role != 'admin' and tx.buyer_id != u.id and tx.seller_id != u.id:
        return _err('Forbidden', 403)
    return jsonify(tx.to_dict())


# ── buyer: list my transactions ───────────────────────────────────────────────

@tx_bp.get('/mine')
@jwt_required()
def my_transactions():
    u   = _get_user()
    txs = Transaction.query.filter_by(buyer_id=u.id).order_by(Transaction.created_at.desc()).all()
    return jsonify([t.to_dict() for t in txs])