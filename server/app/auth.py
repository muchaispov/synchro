"""
auth.py — Authentication routes.

Endpoints:
  POST /api/auth/register/seller    seller email+password registration
  POST /api/auth/login              seller/admin email+password login
  POST /api/auth/otp/request        buyer OTP via phone OR email (60s rate limit)
  POST /api/auth/otp/verify         verify OTP → JWT
  GET  /api/auth/me                 current user profile
  PATCH /api/auth/me                update name/phone
  POST /api/auth/change-password    change password (sellers/admins)
  POST /api/auth/admin/seed         create first admin (header-secret)
"""

import os, random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
from app.models import db, User
from app.sms import notify
from app.email_service import send_otp_email

auth_bp = Blueprint('auth', __name__)
bcrypt  = Bcrypt()


# ── helpers ───────────────────────────────────────────────────────────────────

def _token(user):
    return create_access_token(identity=user.id, expires_delta=timedelta(hours=48))

def _err(msg, code=400):
    return jsonify({'error': msg}), code

def _gen_otp():
    return str(random.randint(100000, 999999))

def _normalise_phone(phone: str) -> str:
    phone = phone.strip().replace(' ', '').replace('-', '')
    if phone.startswith('07') or phone.startswith('01'):
        phone = '+254' + phone[1:]
    elif phone.startswith('254') and not phone.startswith('+'):
        phone = '+' + phone
    return phone

def _is_email(val: str) -> bool:
    return '@' in val and '.' in val.split('@')[-1]


# ── seller register ───────────────────────────────────────────────────────────

@auth_bp.post('/register/seller')
def register_seller():
    d = request.get_json() or {}
    if not d.get('full_name') or not d.get('email') or not d.get('password'):
        return _err('full_name, email and password are required')
    if User.query.filter_by(email=d['email'].lower().strip()).first():
        return _err('Email already registered', 409)

    phone = _normalise_phone(d['phone']) if d.get('phone') else None
    u = User(
        full_name     = d['full_name'].strip(),
        email         = d['email'].lower().strip(),
        phone         = phone,
        role          = 'seller',
        password_hash = bcrypt.generate_password_hash(d['password']).decode(),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify({'token': _token(u), 'user': u.to_dict()}), 201


# ── seller / admin login ──────────────────────────────────────────────────────

@auth_bp.post('/login')
def login():
    d = request.get_json() or {}
    u = User.query.filter_by(email=d.get('email', '').lower().strip()).first()
    if not u or not bcrypt.check_password_hash(u.password_hash or '', d.get('password', '')):
        return _err('Invalid email or password', 401)
    if not u.is_active:
        return _err('Account suspended — contact support', 403)
    return jsonify({'token': _token(u), 'user': u.to_dict()})


# ── buyer OTP request (phone OR email) ───────────────────────────────────────

@auth_bp.post('/otp/request')
def otp_request():
    d        = request.get_json() or {}
    name     = d.get('full_name', 'Buyer').strip()
    contact  = d.get('phone', '') or d.get('email', '')
    contact  = contact.strip()

    if not contact:
        return _err('phone or email is required')

    via_email = _is_email(contact)

    if via_email:
        email = contact.lower()
        u = User.query.filter_by(email=email).first()
        if not u:
            u = User(full_name=name, email=email, role='buyer', is_verified=False)
            db.session.add(u)
            db.session.flush()
    else:
        phone = _normalise_phone(contact)
        u = User.query.filter_by(phone=phone).first()
        if not u:
            u = User(full_name=name, phone=phone, role='buyer', is_verified=False)
            db.session.add(u)
            db.session.flush()

    # 60-second rate limit
    if u.otp_expires and u.otp_code:
        seconds_remaining = (u.otp_expires - datetime.utcnow()).total_seconds()
        cooldown = seconds_remaining - (10 * 60 - 60)
        if cooldown > 0:
            return _err(f'Wait {int(cooldown)}s before requesting another OTP', 429)

    otp           = _gen_otp()
    u.otp_code    = otp
    u.otp_expires = datetime.utcnow() + timedelta(minutes=10)
    db.session.commit()

    if via_email:
        send_otp_email(email, otp, name)
        channel = 'email'
    else:
        notify('otp', phone, otp=otp)
        channel = 'phone'

    return jsonify({
        'message':   f'OTP sent to your {channel}',
        'channel':   channel,
   #     'debug_otp': otp if os.getenv('FLASK_DEBUG') else None,
    })


# ── buyer OTP verify ──────────────────────────────────────────────────────────

@auth_bp.post('/otp/verify')
def otp_verify():
    d       = request.get_json() or {}
    contact = (d.get('phone', '') or d.get('email', '')).strip()
    otp     = d.get('otp', '').strip()

    if not contact:
        return _err('phone or email is required')

    via_email = _is_email(contact)

    if via_email:
        u = User.query.filter_by(email=contact.lower()).first()
    else:
        u = User.query.filter_by(phone=_normalise_phone(contact)).first()

    if not u:
        return _err('Account not found — request an OTP first', 404)
    if not u.otp_code or u.otp_code != otp:
        return _err('Invalid OTP', 401)
    if datetime.utcnow() > u.otp_expires:
        return _err('OTP has expired — request a new one', 401)
    if not u.is_active:
        return _err('Account suspended', 403)

    u.is_verified = True
    u.otp_code    = None
    u.otp_expires = None
    db.session.commit()

    return jsonify({'token': _token(u), 'user': u.to_dict()})


# ── me ────────────────────────────────────────────────────────────────────────

@auth_bp.get('/me')
@jwt_required()
def me():
    u = User.query.get(get_jwt_identity())
    if not u:
        return _err('User not found', 404)
    return jsonify(u.to_dict())


@auth_bp.patch('/me')
@jwt_required()
def update_me():
    u = User.query.get(get_jwt_identity())
    if not u:
        return _err('User not found', 404)
    d = request.get_json() or {}
    if 'full_name' in d and d['full_name'].strip():
        u.full_name = d['full_name'].strip()
    if 'phone' in d:
        phone = _normalise_phone(d['phone'].strip()) if d['phone'] else None
        if phone and phone != u.phone:
            if User.query.filter_by(phone=phone).first():
                return _err('Phone number already in use', 409)
        u.phone = phone
    db.session.commit()
    return jsonify(u.to_dict())


@auth_bp.post('/change-password')
@jwt_required()
def change_password():
    u = User.query.get(get_jwt_identity())
    if not u:
        return _err('User not found', 404)
    d = request.get_json() or {}
    if not bcrypt.check_password_hash(u.password_hash or '', d.get('current_password', '')):
        return _err('Current password is incorrect', 401)
    new_pw = d.get('new_password', '')
    if len(new_pw) < 8:
        return _err('Password must be at least 8 characters')
    u.password_hash = bcrypt.generate_password_hash(new_pw).decode()
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'})


# ── admin seed ────────────────────────────────────────────────────────────────

@auth_bp.post('/admin/seed')
def seed_admin():
    secret = request.headers.get('X-Admin-Secret', '')
    if secret != os.getenv('ADMIN_SEED_SECRET', 'changeme'):
        return _err('Forbidden', 403)
    d = request.get_json() or {}
    if not d.get('email') or not d.get('password') or not d.get('full_name'):
        return _err('full_name, email and password are required')
    if User.query.filter_by(email=d['email'], role='admin').first():
        return _err('Admin already exists', 409)
    u = User(
        full_name     = d['full_name'],
        email         = d['email'],
        role          = 'admin',
        admin_level   = 'super_admin',
        password_hash = bcrypt.generate_password_hash(d['password']).decode(),
        is_verified   = True,
    )
    db.session.add(u)
    db.session.commit()
    return jsonify({'message': 'Admin created', 'id': u.id}), 201
