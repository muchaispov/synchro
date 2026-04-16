"""
mpesa.py — Safaricom Daraja API service.

Functions:
  stk_push(phone, amount, reference, description) → initiate payment from buyer
  stk_query(checkout_request_id)                  → poll payment status
  b2c_transfer(phone, amount, reference)          → payout to seller M-Pesa
"""

import os, base64, requests
from datetime import datetime


def _get_token() -> str:
    """Fetch OAuth access token from Daraja."""
    key    = os.getenv('MPESA_CONSUMER_KEY', '')
    secret = os.getenv('MPESA_CONSUMER_SECRET', '')
    creds  = base64.b64encode(f"{key}:{secret}".encode()).decode()
    r = requests.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        headers={'Authorization': f'Basic {creds}'},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()['access_token']


def _normalise_phone(phone: str) -> str:
    """Convert 07XX or 01XX → 2547XX (no + prefix, as Daraja expects)."""
    phone = phone.strip().replace('+', '').replace(' ', '').replace('-', '')
    if phone.startswith('07') or phone.startswith('01'):
        phone = '254' + phone[1:]
    return phone


def _stk_password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def stk_push(phone: str, amount: int, reference: str, description: str) -> dict:
    """
    Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).
    Returns the full Daraja response dict.
    ResponseCode == '0' means the prompt was sent successfully.
    """
    token     = _get_token()
    shortcode = os.getenv('MPESA_SHORTCODE', '174379')
    passkey   = os.getenv('MPESA_PASSKEY', '')
    callback  = os.getenv('MPESA_CALLBACK_URL', 'https://yourapp.onrender.com/api/payments/mpesa/callback')
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

    r = requests.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        json={
            'BusinessShortCode': shortcode,
            'Password':          _stk_password(shortcode, passkey, timestamp),
            'Timestamp':         timestamp,
            'TransactionType':   'CustomerPayBillOnline',
            'Amount':            int(amount),
            'PartyA':            _normalise_phone(phone),
            'PartyB':            shortcode,
            'PhoneNumber':       _normalise_phone(phone),
            'CallBackURL':       callback,
            'AccountReference':  reference,
            'TransactionDesc':   description[:20],
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def stk_query(checkout_request_id: str) -> dict:
    """
    Query the status of a pending STK Push.
    ResultCode == 0 means paid. ResultCode == 1032 means still waiting.
    """
    token     = _get_token()
    shortcode = os.getenv('MPESA_SHORTCODE', '174379')
    passkey   = os.getenv('MPESA_PASSKEY', '')
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

    r = requests.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        json={
            'BusinessShortCode':  shortcode,
            'Password':           _stk_password(shortcode, passkey, timestamp),
            'Timestamp':          timestamp,
            'CheckoutRequestID':  checkout_request_id,
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def b2c_transfer(phone: str, amount: int, reference: str) -> dict:
    """
    Send money to a seller via B2C (Business to Customer).
    Used for seller payouts after admin approval.
    """
    token     = _get_token()
    shortcode = os.getenv('MPESA_SHORTCODE', '174379')

    r = requests.post(
        'https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest',
        json={
            'OriginatorConversationID': reference,
            'InitiatorName':            os.getenv('MPESA_INITIATOR_NAME', 'testapi'),
            'SecurityCredential':       os.getenv('MPESA_SECURITY_CREDENTIAL', ''),
            'CommandID':                'BusinessPayment',
            'Amount':                   int(amount),
            'PartyA':                   shortcode,
            'PartyB':                   _normalise_phone(phone),
            'Remarks':                  f'Synchro payout {reference}',
            'QueueTimeOutURL':          os.getenv('MPESA_TIMEOUT_URL', 'https://yourapp.onrender.com/api/payments/mpesa/timeout'),
            'ResultURL':                os.getenv('MPESA_RESULT_URL',  'https://yourapp.onrender.com/api/payments/mpesa/result'),
            'Occasion':                 reference,
        },
        headers={'Authorization': f'Bearer {token}'},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()