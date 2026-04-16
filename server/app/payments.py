"""
payments.py — Payment initiation and webhook routes.

Endpoints:
  POST /api/payments/mpesa/initiate/<tx_id>   — initiate M-Pesa STK Push (buyer)
  POST /api/payments/mpesa/query              — poll STK Push status (buyer)
  POST /api/payments/mpesa/callback           — Daraja server callback (public)
  POST /api/payments/card/initiate/<tx_id>    — initiate Paystack card payment (buyer)
  GET  /api/payments/card/verify/<reference>  — verify card payment after redirect (buyer)
  POST /api/payments/paystack/webhook         — Paystack signed webhook (public)
"""

import os, hmac, hashlib, requests as http
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, Transaction
from app import mpesa as mpesa_svc
from app.sms import notify

pay_bp   = Blueprint('payments', __name__)
BASE_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000' 'https://synchro.co.ke')


def _err(msg, code=400):
    return jsonify({'error': msg}), code

def _get_tx(tx_id, uid):
    """Fetch transaction and verify ownership."""
    tx = Transaction.query.get_or_404(tx_id)
    if tx.buyer_id != uid:
        return None, _err('Forbidden', 403)
    if tx.status != 'PENDING':
        return None, _err('Transaction has already been processed')
    return tx, None

def _fund_transaction(tx, mpesa_ref=None, paystack_ref=None):
    """Mark a transaction as FUNDED and trigger SMS notifications."""
    tx.status    = 'FUNDED'
    tx.funded_at = datetime.utcnow()
    if mpesa_ref:
        tx.mpesa_ref = mpesa_ref
    if paystack_ref:
        tx.paystack_ref = str(paystack_ref)
    db.session.commit()

    notify('funded', tx.buyer.phone or '',
           buyer_name=tx.buyer.full_name, amount=f"{tx.amount:,.0f}",
           title=tx.title, url=f"{BASE_URL}/track/{tx.reference}")
    notify('link_paid', tx.seller.phone or '',
           seller_name=tx.seller.full_name, amount=f"{tx.amount:,.0f}",
           title=tx.title, url=f"{BASE_URL}/seller/orders")


# ── M-Pesa: initiate STK Push ─────────────────────────────────────────────────

@pay_bp.post('/mpesa/initiate/<tx_id>')
@jwt_required()
def mpesa_initiate(tx_id):
    uid      = get_jwt_identity()
    tx, err  = _get_tx(tx_id, uid)
    if err: return err

    buyer = User.query.get(uid)
    phone = (request.get_json() or {}).get('phone') or buyer.phone
    if not phone:
        return _err('phone is required')

    try:
        result = mpesa_svc.stk_push(
            phone       = phone,
            amount      = int(tx.amount),
            reference   = tx.reference,
            description = tx.title[:20],
        )
        print(f"[MPESA INITIATE] result={result}")  # debug
    except Exception as e:
        return _err(f'M-Pesa error: {str(e)}', 502)

    if result.get('ResponseCode') != '0':
        return _err(result.get('errorMessage', 'M-Pesa initiation failed'), 502)

    tx.payment_method     = 'mpesa'
    tx.mpesa_checkout_id  = result.get('CheckoutRequestID')
    db.session.commit()

    return jsonify({
        'checkout_request_id': result['CheckoutRequestID'],
        'message':             'STK Push sent — enter your M-Pesa PIN',
    })


# ── M-Pesa: poll status (frontend polling fallback) ───────────────────────────

@pay_bp.post('/mpesa/query')
@jwt_required()
def mpesa_query():
    d   = request.get_json() or {}
    cid = d.get('checkout_request_id')
    if not cid:
        return _err('checkout_request_id is required')
    try:
        result = mpesa_svc.stk_query(cid)
        print(f"[MPESA QUERY] result={result}")  # debug

        # If query confirms payment succeeded, fund the transaction directly
        # This handles cases where the callback fires empty in sandbox
        if result.get('ResultCode') == 0 or result.get('ResultCode') == '0':
            tx = Transaction.query.filter_by(mpesa_checkout_id=cid).first()
            if tx and tx.status == 'PENDING':
                _fund_transaction(tx, mpesa_ref=result.get('MpesaReceiptNumber'))
                print(f"[MPESA QUERY] Funded tx {tx.reference} via query polling")

    except Exception as e:
        return _err(f'M-Pesa query error: {str(e)}', 502)
    return jsonify(result)


# ── M-Pesa: Daraja callback (called by Safaricom servers) ─────────────────────

@pay_bp.post('/mpesa/callback')
def mpesa_callback():
    data        = request.get_json(silent=True) or {}
    print(f"[MPESA CALLBACK] Raw: {data}")
    body        = data.get('Body', {}).get('stkCallback', {})
    result_code = body.get('ResultCode')
    print(f"[MPESA CALLBACK] ResultCode={result_code} CheckoutID={body.get('CheckoutRequestID')}")

    # Fix: None means empty callback body — don't exit early, just log and accept
    if result_code is None:
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'})

    if result_code != 0:
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'})

    # Parse callback metadata into a flat dict
    items    = body.get('CallbackMetadata', {}).get('Item', [])
    item_map = {i.get('Name'): i.get('Value') for i in items}
    mpesa_ref       = item_map.get('MpesaReceiptNumber')
    checkout_req_id = body.get('CheckoutRequestID')

    # Match transaction
    tx = None
    if checkout_req_id:
        tx = Transaction.query.filter_by(mpesa_checkout_id=checkout_req_id).first()
    if not tx:
        account_ref = item_map.get('AccountReference')
        if account_ref:
            tx = Transaction.query.filter_by(reference=account_ref).first()

    if not tx:
        print(f"[MPESA CALLBACK] Unmatched. CheckoutID={checkout_req_id} items={item_map}")
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'})

    if tx.status != 'PENDING':
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Already processed'})

    _fund_transaction(tx, mpesa_ref=mpesa_ref)
    print(f"[MPESA CALLBACK] Funded tx {tx.reference}")
    return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'})


# ── Paystack: initiate card payment ──────────────────────────────────────────

@pay_bp.post('/card/initiate/<tx_id>')
@jwt_required()
def card_initiate(tx_id):
    uid     = get_jwt_identity()
    tx, err = _get_tx(tx_id, uid)
    if err: return err

    buyer    = User.query.get(uid)
    email    = buyer.email or f"{tx.reference}@synchro.buyer"
    callback = f"{BASE_URL}/track/{tx.reference}?verify=1"

    try:
        r = http.post(
            'https://api.paystack.co/transaction/initialize',
            json={
                'email':        email,
                'amount':       int(tx.amount * 100),  # Paystack uses kobo (lowest denomination)
                'reference':    tx.reference,
                'callback_url': callback,
                'metadata':     {'tx_id': tx.id, 'synchro': True},
            },
            headers={'Authorization': f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}"},
            timeout=15,
        )
        data = r.json()
    except Exception as e:
        return _err(f'Paystack error: {str(e)}', 502)

    if not data.get('status'):
        return _err(data.get('message', 'Paystack initiation failed'), 502)

    tx.payment_method = 'card'
    db.session.commit()
    return jsonify({'authorization_url': data['data']['authorization_url']})


# ── Paystack: verify after redirect ──────────────────────────────────────────

@pay_bp.get('/card/verify/<reference>')
@jwt_required()
def card_verify(reference):
    tx = Transaction.query.filter_by(reference=reference).first()
    if not tx:
        return _err('Transaction not found', 404)

    try:
        r    = http.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={'Authorization': f"Bearer {os.getenv('PAYSTACK_SECRET_KEY')}"},
            timeout=10,
        )
        data = r.json()
    except Exception as e:
        return _err(f'Paystack error: {str(e)}', 502)

    if data.get('status') and data['data']['status'] == 'success' and tx.status == 'PENDING':
        _fund_transaction(tx, paystack_ref=data['data']['id'])

    return jsonify(tx.to_dict())


# ── Paystack: signed webhook ──────────────────────────────────────────────────

@pay_bp.post('/paystack/webhook')
def paystack_webhook():
    sig      = request.headers.get('x-paystack-signature', '')
    raw_body = request.get_data()
    key      = os.getenv('PAYSTACK_SECRET_KEY', '').encode()
    expected = hmac.new(key, raw_body, hashlib.sha512).hexdigest()

    if not hmac.compare_digest(expected, sig):
        return _err('Invalid signature', 400)

    data  = request.get_json(silent=True) or {}
    event = data.get('event')

    if event == 'charge.success':
        ref = data['data']['reference']
        tx  = Transaction.query.filter_by(reference=ref).first()
        if tx and tx.status == 'PENDING':
            try:
                _fund_transaction(tx, paystack_ref=data['data']['id'])
            except Exception:
                db.session.rollback()  # handles duplicate paystack_ref (unique constraint)

    return jsonify({'status': 'ok'})