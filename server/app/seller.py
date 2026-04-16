"""
seller.py — Seller-specific routes.

Endpoints:
  GET    /api/seller/summary              — dashboard summary (earnings, balance, stats)
  GET    /api/seller/bank-accounts        — list payout accounts
  POST   /api/seller/bank-accounts        — add a payout account (M-Pesa or bank)
  DELETE /api/seller/bank-accounts/<id>   — remove a payout account
  POST   /api/seller/withdraw             — request a withdrawal
  GET    /api/seller/withdrawals          — list withdrawal history
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app.models import db, User, BankAccount, WithdrawalRequest, Transaction

seller_bp = Blueprint('seller', __name__)


def _err(msg, code=400):
    return jsonify({'error': msg}), code

def _require_seller():
    uid = get_jwt_identity()
    u   = User.query.get(uid)
    if not u or u.role != 'seller':
        return None, _err('Seller account required', 403)
    if not u.is_active:
        return None, _err('Account suspended', 403)
    return u, None


# ── summary ───────────────────────────────────────────────────────────────────

@seller_bp.get('/summary')
@jwt_required()
def seller_summary():
    u, err = _require_seller()
    if err: return err

    active    = Transaction.query.filter_by(seller_id=u.id, status='FUNDED').count()
    delivered = Transaction.query.filter_by(seller_id=u.id, status='DELIVERED').count()
    completed = Transaction.query.filter_by(seller_id=u.id, status='COMPLETED').count()
    disputed  = Transaction.query.filter_by(seller_id=u.id, status='DISPUTED').count()

    total_earned = db.session.query(func.sum(Transaction.seller_receives)).filter_by(
        seller_id=u.id, status='COMPLETED').scalar() or 0

    # Available balance = earnings minus already-approved/paid withdrawals
    total_withdrawn = db.session.query(func.sum(WithdrawalRequest.amount)).filter(
        WithdrawalRequest.seller_id == u.id,
        WithdrawalRequest.status.in_(['approved', 'paid'])
    ).scalar() or 0

    available_balance = max(0.0, total_earned - total_withdrawn)

    pending_wr = WithdrawalRequest.query.filter_by(seller_id=u.id, status='pending').first()

    return jsonify({
        'active_escrow':         active,
        'awaiting_confirmation': delivered,
        'completed':             completed,
        'disputed':              disputed,
        'total_earned':          total_earned,
        'total_withdrawn':       total_withdrawn,
        'available_balance':     available_balance,
        'reputation_score':      u.reputation_score,
        'pending_withdrawal':    pending_wr.amount if pending_wr else None,
    })


# ── payout accounts ───────────────────────────────────────────────────────────

@seller_bp.get('/bank-accounts')
@jwt_required()
def get_accounts():
    u, err = _require_seller()
    if err: return err
    accounts = BankAccount.query.filter_by(user_id=u.id).all()
    return jsonify([a.to_dict() for a in accounts])


@seller_bp.post('/bank-accounts')
@jwt_required()
def add_account():
    u, err = _require_seller()
    if err: return err

    d = request.get_json() or {}
    if not d.get('mpesa_phone') and not d.get('account_number'):
        return _err('Provide either mpesa_phone or account_number')

    # Make all existing accounts non-primary
    BankAccount.query.filter_by(user_id=u.id).update({'is_primary': False})

    acc = BankAccount(
        user_id        = u.id,
        mpesa_phone    = d.get('mpesa_phone'),
        bank_name      = d.get('bank_name'),
        account_number = d.get('account_number'),
        account_name   = d.get('account_name'),
        is_primary     = True,
    )
    db.session.add(acc)
    db.session.commit()
    return jsonify(acc.to_dict()), 201


@seller_bp.delete('/bank-accounts/<acc_id>')
@jwt_required()
def delete_account(acc_id):
    u, err = _require_seller()
    if err: return err

    acc = BankAccount.query.get_or_404(acc_id)
    if acc.user_id != u.id:
        return _err('Forbidden', 403)

    db.session.delete(acc)
    db.session.commit()
    return jsonify({'message': 'Account removed'})


# ── withdrawals ───────────────────────────────────────────────────────────────

@seller_bp.post('/withdraw')
@jwt_required()
def request_withdrawal():
    u, err = _require_seller()
    if err: return err

    d      = request.get_json() or {}
    amount = float(d.get('amount', 0))
    if amount <= 0:
        return _err('Invalid amount')
    if amount < 100:
        return _err('Minimum withdrawal is KES 100')

    acc = BankAccount.query.filter_by(user_id=u.id, is_primary=True).first()
    if not acc:
        return _err('Add a payout account before requesting a withdrawal')

    existing = WithdrawalRequest.query.filter_by(seller_id=u.id, status='pending').first()
    if existing:
        return _err('You already have a pending withdrawal request')

    wr = WithdrawalRequest(seller_id=u.id, bank_account_id=acc.id, amount=amount)
    db.session.add(wr)
    db.session.commit()
    return jsonify(wr.to_dict()), 201


@seller_bp.get('/withdrawals')
@jwt_required()
def list_withdrawals():
    u, err = _require_seller()
    if err: return err

    reqs = WithdrawalRequest.query.filter_by(seller_id=u.id).order_by(
        WithdrawalRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reqs])