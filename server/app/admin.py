"""
admin.py — Admin portal routes with tiered access control.

Admin levels:
  super_admin — full access including team management and invites
  admin       — disputes, payouts, users, settings (no team management)

Endpoints:
  GET  /api/admin/overview
  GET  /api/admin/transactions
  POST /api/admin/disputes/<tx_id>/resolve
  GET  /api/admin/payouts
  POST /api/admin/payouts/<id>/approve
  POST /api/admin/payouts/<id>/reject
  GET  /api/admin/users
  POST /api/admin/users/<id>/ban
  POST /api/admin/users/<id>/verify-kyc
  GET  /api/admin/settings
  POST /api/admin/settings
  GET  /api/admin/activity                  — audit log (super_admin only)
  GET  /api/admin/team                      — list admins (super_admin only)
  POST /api/admin/team/invite               — send invite email (super_admin only)
  DELETE /api/admin/team/<id>               — remove admin (super_admin only)
  POST /api/admin/team/accept-invite        — accept invite and set password (public)
"""

import os, secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from app.models import (db, User, Transaction, WithdrawalRequest,
                        BankAccount, PlatformSettings, AdminActivity, AdminInvite)
from app import mpesa as mpesa_svc
from app.sms import notify
from app.email_service import send_notification_email

admin_bp = Blueprint('admin', __name__)


def _err(msg, code=400):
    return jsonify({'error': msg}), code


def _require_admin(level=None):
    """
    Validate admin JWT and optionally enforce a minimum level.
    level=None  → any admin
    level='super_admin' → only super_admin
    Returns (user, None) or (None, error_response).
    """
    try:
        uid = get_jwt_identity()
    except Exception:
        return None, _err('Authentication required', 401)
    if not uid:
        return None, _err('Authentication required', 401)

    u = User.query.get(uid)
    if not u:
        return None, _err('User not found', 404)
    if not u.is_active:
        return None, _err('Account suspended', 403)
    if u.role != 'admin':
        return None, _err('Admin access required', 403)
    if level == 'super_admin' and u.admin_level != 'super_admin':
        return None, _err('Super admin access required', 403)

    return u, None


def _log(admin, action, target_type=None, target_id=None, detail=None):
    """Record an admin action to the audit log."""
    entry = AdminActivity(
        admin_id    = admin.id,
        action      = action,
        target_type = target_type,
        target_id   = target_id,
        detail      = detail,
    )
    db.session.add(entry)
    # Don't commit here — caller commits with the main action


# ── overview ──────────────────────────────────────────────────────────────────

@admin_bp.get('/overview')
@jwt_required()
def overview():
    _, err = _require_admin()
    if err: return err

    total_gmv      = db.session.query(func.sum(Transaction.amount)).filter_by(status='COMPLETED').scalar() or 0
    platform_rev   = db.session.query(func.sum(Transaction.platform_fee)).filter_by(status='COMPLETED').scalar() or 0
    escrowed       = db.session.query(func.sum(Transaction.amount)).filter(Transaction.status.in_(['FUNDED','DELIVERED'])).scalar() or 0
    total_tx       = Transaction.query.count()
    open_disputes  = Transaction.query.filter_by(status='DISPUTED').count()
    total_sellers  = User.query.filter_by(role='seller').count()
    total_buyers   = User.query.filter_by(role='buyer').count()
    pending_payouts= WithdrawalRequest.query.filter_by(status='pending').count()

    daily_gmv = []
    for days_ago in range(6, -1, -1):
        day       = (datetime.utcnow() - timedelta(days=days_ago)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end   = datetime.combine(day, datetime.max.time())
        gmv = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.status == 'COMPLETED',
            Transaction.completed_at.between(day_start, day_end),
        ).scalar() or 0
        daily_gmv.append({'date': day.isoformat(), 'gmv': gmv})

    return jsonify({
        'total_gmv':          total_gmv,
        'platform_revenue':   platform_rev,
        'escrowed':           escrowed,
        'total_transactions': total_tx,
        'open_disputes':      open_disputes,
        'total_sellers':      total_sellers,
        'total_buyers':       total_buyers,
        'pending_payouts':    pending_payouts,
        'daily_gmv':          daily_gmv,
    })


# ── transactions ──────────────────────────────────────────────────────────────

@admin_bp.get('/transactions')
@jwt_required()
def all_transactions():
    _, err = _require_admin()
    if err: return err
    status = request.args.get('status')
    q = Transaction.query
    if status:
        q = q.filter_by(status=status)
    txs = q.order_by(Transaction.created_at.desc()).limit(200).all()
    return jsonify([t.to_dict() for t in txs])


# ── dispute resolution ─────────────────────────────────────────────────────────

@admin_bp.post('/disputes/<tx_id>/resolve')
@jwt_required()
def resolve_dispute(tx_id):
    admin, err = _require_admin()
    if err: return err

    tx = Transaction.query.get_or_404(tx_id)
    if tx.status != 'DISPUTED':
        return _err('Transaction is not in DISPUTED status')

    d      = request.get_json() or {}
    action = d.get('action')
    if action not in ('refund', 'release'):
        return _err("action must be 'refund' or 'release'")

    tx.admin_note     = d.get('note')
    tx.handled_by_id  = admin.id

    if action == 'release':
        tx.status       = 'COMPLETED'
        tx.completed_at = datetime.utcnow()
        tx.seller.total_completed += 1
        detail = f"Released {tx.amount:,.0f} KES to seller {tx.seller.full_name}"
    else:
        tx.status = 'REFUNDED'
        tx.seller.total_disputed += 1
        detail = f"Refunded {tx.amount:,.0f} KES to buyer {tx.buyer.full_name}"

    _log(admin, f'resolve_dispute_{action}', 'transaction', tx.id, detail)
    db.session.commit()
    return jsonify(tx.to_dict())


# ── payout management ─────────────────────────────────────────────────────────

@admin_bp.get('/payouts')
@jwt_required()
def list_payouts():
    _, err = _require_admin()
    if err: return err
    status = request.args.get('status', 'pending')
    reqs   = WithdrawalRequest.query.filter_by(status=status).order_by(
                 WithdrawalRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reqs])


@admin_bp.post('/payouts/<req_id>/approve')
@jwt_required()
def approve_payout(req_id):
    admin, err = _require_admin()
    if err: return err

    wr = WithdrawalRequest.query.get_or_404(req_id)
    if wr.status != 'pending':
        return _err('Withdrawal has already been processed')

    d            = request.get_json() or {}
    phone        = wr.bank_account.mpesa_phone or wr.seller.phone
    transfer_ref = None

    if phone:
        try:
            result       = mpesa_svc.b2c_transfer(phone, int(wr.amount), wr.id)
            transfer_ref = result.get('ConversationID')
        except Exception as e:
            print(f"[B2C ERROR] {e}")

    wr.status        = 'approved'
    wr.admin_note    = d.get('note')
    wr.transfer_ref  = transfer_ref
    wr.resolved_at   = datetime.utcnow()
    wr.handled_by_id = admin.id

    _log(admin, 'approve_payout', 'withdrawal', wr.id,
         f"Approved KES {wr.amount:,.0f} payout to {wr.seller.full_name}")
    db.session.commit()

    notify('payout_approved', wr.seller.phone or '',
           seller_name=wr.seller.full_name,
           amount=f"{wr.amount:,.0f}",
           reference=wr.transfer_ref or wr.id)

    return jsonify(wr.to_dict())


@admin_bp.post('/payouts/<req_id>/reject')
@jwt_required()
def reject_payout(req_id):
    admin, err = _require_admin()
    if err: return err

    wr = WithdrawalRequest.query.get_or_404(req_id)
    if wr.status != 'pending':
        return _err('Withdrawal has already been processed')

    d              = request.get_json() or {}
    wr.status      = 'rejected'
    wr.admin_note  = d.get('note')
    wr.resolved_at = datetime.utcnow()
    wr.handled_by_id = admin.id

    _log(admin, 'reject_payout', 'withdrawal', wr.id,
         f"Rejected KES {wr.amount:,.0f} payout for {wr.seller.full_name}. Reason: {d.get('note','—')}")
    db.session.commit()
    return jsonify(wr.to_dict())


# ── user management ───────────────────────────────────────────────────────────

@admin_bp.get('/users')
@jwt_required()
def list_users():
    _, err = _require_admin()
    if err: return err
    role  = request.args.get('role')
    q     = User.query.filter(User.role != 'admin')  # admins managed via /team
    if role:
        q = q.filter_by(role=role)
    users = q.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])


@admin_bp.post('/users/<user_id>/ban')
@jwt_required()
def ban_user(user_id):
    admin, err = _require_admin()
    if err: return err

    u           = User.query.get_or_404(user_id)
    if u.role == 'admin':
        return _err('Use team management to modify admin accounts', 403)
    u.is_active = not u.is_active
    action      = 'unban_user' if u.is_active else 'ban_user'
    _log(admin, action, 'user', u.id, f"{'Unbanned' if u.is_active else 'Banned'} {u.full_name}")
    db.session.commit()
    return jsonify({'message': f"User {'unbanned' if u.is_active else 'banned'}", 'user': u.to_dict()})


@admin_bp.post('/users/<user_id>/verify-kyc')
@jwt_required()
def verify_kyc(user_id):
    admin, err = _require_admin()
    if err: return err

    u             = User.query.get_or_404(user_id)
    d             = request.get_json() or {}
    u.kyc_status  = d.get('status', 'approved')
    u.is_verified = (u.kyc_status == 'approved')
    _log(admin, 'verify_kyc', 'user', u.id, f"KYC {u.kyc_status} for {u.full_name}")
    db.session.commit()
    return jsonify(u.to_dict())


# ── platform settings ─────────────────────────────────────────────────────────

@admin_bp.get('/settings')
@jwt_required()
def get_settings():
    _, err = _require_admin()
    if err: return err
    settings = PlatformSettings.query.all()
    return jsonify({s.key: s.value for s in settings})


@admin_bp.post('/settings')
@jwt_required()
def update_settings():
    admin, err = _require_admin()
    if err: return err

    d = request.get_json() or {}
    for key, value in d.items():
        s = PlatformSettings.query.filter_by(key=key).first()
        if s:
            s.value = str(value)
        else:
            db.session.add(PlatformSettings(key=key, value=str(value)))
    _log(admin, 'update_settings', detail=f"Updated: {', '.join(d.keys())}")
    db.session.commit()
    return jsonify({'message': 'Settings updated'})


# ── activity log (super_admin only) ──────────────────────────────────────────

@admin_bp.get('/activity')
@jwt_required()
def activity_log():
    _, err = _require_admin()   # any admin can view
    if err: return err

    limit   = int(request.args.get('limit', 50))
    offset  = int(request.args.get('offset', 0))
    entries = AdminActivity.query.order_by(AdminActivity.created_at.desc()).limit(limit).offset(offset).all()
    return jsonify([e.to_dict() for e in entries])


# ── admin team management (super_admin only) ──────────────────────────────────

@admin_bp.get('/team')
@jwt_required()
def list_team():
    _, err = _require_admin(level='super_admin')
    if err: return err
    admins = User.query.filter_by(role='admin').order_by(User.created_at.asc()).all()
    return jsonify([u.to_dict() for u in admins])


@admin_bp.post('/team/invite')
@jwt_required()
def invite_admin():
    admin, err = _require_admin(level='super_admin')
    if err: return err

    d     = request.get_json() or {}
    email = d.get('email', '').lower().strip()
    level = d.get('admin_level', 'admin')

    if not email:
        return _err('email is required')
    if level not in ('admin', 'super_admin'):
        return _err('admin_level must be admin or super_admin')
    if User.query.filter_by(email=email).first():
        return _err('This email is already registered', 409)

    # Check for existing unused invite
    existing = AdminInvite.query.filter_by(email=email, used=False).first()
    if existing and existing.expires_at > datetime.utcnow():
        return _err('An invite has already been sent to this email', 409)

    token  = secrets.token_urlsafe(32)
    invite = AdminInvite(
        invited_by  = admin.id,
        email       = email,
        admin_level = level,
        token       = token,
        expires_at  = datetime.utcnow() + timedelta(days=3),
    )
    db.session.add(invite)

    # Send invite email
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    invite_url   = f"{frontend_url}/admin/accept-invite?token={token}"
    html = f"""
    <div style="background:#080a0e;padding:40px;font-family:system-ui;color:#e8edf5;">
      <h2 style="color:#c9a84c;font-size:24px;margin-bottom:16px;">You've been invited to Synchro Admin</h2>
      <p style="color:#6b7a94;margin-bottom:24px;">
        <strong style="color:#e8edf5">{admin.full_name}</strong> has invited you to join the Synchro admin team as <strong style="color:#c9a84c">{level.replace('_',' ').title()}</strong>.
      </p>
      <a href="{invite_url}" style="display:inline-block;background:#c9a84c;color:#080a0e;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;margin-bottom:24px;">
        Accept Invitation
      </a>
      <p style="color:#35425a;font-size:12px;">This invite expires in 3 days. If you did not expect this, ignore this email.</p>
    </div>
    """
    send_notification_email(email, f"Admin invite — Synchro", html)

    _log(admin, 'invite_admin', 'invite', invite.id,
         f"Invited {email} as {level}")
    db.session.commit()
    return jsonify({'message': f'Invite sent to {email}', 'invite': invite.to_dict()}), 201


@admin_bp.post('/team/accept-invite')
def accept_invite():
    """Public endpoint — called when invited admin clicks link and sets their password."""
    d        = request.get_json() or {}
    token    = d.get('token', '').strip()
    password = d.get('password', '').strip()
    name     = d.get('full_name', '').strip()

    if not token or not password or not name:
        return _err('token, full_name and password are required')
    if len(password) < 8:
        return _err('Password must be at least 8 characters')

    invite = AdminInvite.query.filter_by(token=token, used=False).first()
    if not invite:
        return _err('Invalid or already-used invite token', 404)
    if datetime.utcnow() > invite.expires_at:
        return _err('This invite has expired. Ask a super admin to resend.', 410)

    from flask_bcrypt import Bcrypt
    bcrypt = Bcrypt()

    # Create the admin user
    u = User(
        full_name     = name,
        email         = invite.email,
        role          = 'admin',
        admin_level   = invite.admin_level,
        password_hash = bcrypt.generate_password_hash(password).decode(),
        is_verified   = True,
        is_active     = True,
    )
    db.session.add(u)
    invite.used = True

    _log(invite.inviter, 'admin_joined', 'user', u.id,
         f"{name} accepted invite and joined as {invite.admin_level}")
    db.session.commit()

    return jsonify({'message': 'Admin account created. You can now sign in.', 'email': u.email}), 201


@admin_bp.delete('/team/<user_id>')
@jwt_required()
def remove_admin(user_id):
    admin, err = _require_admin(level='super_admin')
    if err: return err

    u = User.query.get_or_404(user_id)
    if u.role != 'admin':
        return _err('User is not an admin')
    if u.id == admin.id:
        return _err('You cannot remove yourself')

    _log(admin, 'remove_admin', 'user', u.id,
         f"Removed admin {u.full_name} ({u.email})")

    # Downgrade to buyer rather than delete — preserves audit trail
    u.role        = 'buyer'
    u.admin_level = None
    u.is_active   = False
    db.session.commit()
    return jsonify({'message': f'{u.full_name} removed from admin team'})


@admin_bp.get('/team/invites')
@jwt_required()
def list_invites():
    _, err = _require_admin(level='super_admin')
    if err: return err
    invites = AdminInvite.query.order_by(AdminInvite.created_at.desc()).limit(20).all()
    return jsonify([i.to_dict() for i in invites])

# ── Waitlist ──────────────────────────────────────────────────────────────────

@admin_bp.get('/waitlist')
@jwt_required()
def admin_waitlist():
    _, err = _require_admin()
    if err: return err
    from app.models import WaitlistEntry
    entries = WaitlistEntry.query.order_by(WaitlistEntry.created_at.desc()).all()
    return jsonify({'count': len(entries), 'entries': [e.to_dict() for e in entries]})