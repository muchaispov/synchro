"""
sms.py — Africa's Talking SMS service.

Usage:
  from app.sms import notify
  notify('funded', phone, buyer_name='Jane', amount='5000', title='iPhone', url='...')

Events: funded | delivered | completed | disputed | otp | payout_approved | link_paid
"""

import os

try:
    import africastalking
    _AT_AVAILABLE = True
except ImportError:
    _AT_AVAILABLE = False


# ── Message templates ─────────────────────────────────────────────────────────

TEMPLATES = {
    'otp': (
        "Your Synchro OTP is {otp}. Valid 10 mins. Do not share with anyone."
    ),
    'funded': (
        "Hi {buyer_name}, KES {amount} is held in Synchro escrow for '{title}'. "
        "Track: {url}"
    ),
    'delivered': (
        "Hi {buyer_name}, your order '{title}' has been marked delivered. "
        "Confirm receipt or dispute: {url}"
    ),
    'completed': (
        "Hi {seller_name}, KES {amount} released to your M-Pesa. "
        "Synchro ref: {reference}"
    ),
    'disputed': (
        "Hi {seller_name}, a dispute was raised on '{title}'. "
        "Our team will resolve within 48h. Ref: {reference}"
    ),
    'payout_approved': (
        "Hi {seller_name}, your KES {amount} withdrawal has been approved "
        "and sent to your M-Pesa. Ref: {reference}"
    ),
    'link_paid': (
        "Hi {seller_name}, KES {amount} was just paid for '{title}'. "
        "Log in: {url}"
    ),
}


# ── Core send ─────────────────────────────────────────────────────────────────

def send_sms(phone: str, message: str) -> dict:
    """Send a raw SMS. Falls back to console log if AT not configured."""

    # Normalise to international format
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('07') or phone.startswith('01'):
        phone = '+254' + phone[1:]
    elif phone.startswith('254') and not phone.startswith('+'):
        phone = '+' + phone

    if not _AT_AVAILABLE or not os.getenv('AT_API_KEY'):
        print(f"[SMS MOCK] → {phone}: {message}")
        return {'mock': True, 'phone': phone}

    try:
        africastalking.initialize(
            os.getenv('AT_USERNAME', 'sandbox'),
            os.getenv('AT_API_KEY', '')
        )
        sms  = africastalking.SMS
        resp = sms.send(message, [phone], sender_id=os.getenv('AT_SENDER_ID', 'SYNCHRO'))
        return resp
    except Exception as e:
        print(f"[SMS ERROR] {phone}: {e}")
        return {'error': str(e)}


def notify(event: str, phone: str, **kwargs) -> dict:
    """Send a templated SMS notification. Silently skips if phone is empty."""
    if not phone:
        return {'skipped': 'no phone'}
    template = TEMPLATES.get(event)
    if not template:
        return {'error': f"Unknown event: {event}"}
    try:
        message = template.format(**kwargs)
    except KeyError as e:
        print(f"[SMS TEMPLATE ERROR] event={event} missing key {e}")
        return {'error': str(e)}
    return send_sms(phone, message)