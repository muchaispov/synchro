"""
models.py — All SQLAlchemy database models for Synchro.

Models:
  User                — buyers, sellers, admins
  PaymentLink         — seller-created payment links (fixed, negotiable, milestone)
  LinkMilestone       — milestone breakdown for milestone-type links
  Transaction         — escrow transaction lifecycle
  Message             — per-transaction chat messages
  BankAccount         — seller payout accounts (M-Pesa or bank)
  WithdrawalRequest   — seller withdrawal requests pending admin approval
  PlatformSettings    — key/value admin-configurable settings
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import uuid, secrets, string

db = SQLAlchemy()


# ── ID / reference generators ─────────────────────────────────────────────────

def gen_id():
    return str(uuid.uuid4())

def gen_slug():
    chars = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))

def gen_ref():
    chars = string.ascii_uppercase + string.digits
    return 'SYN-' + ''.join(secrets.choice(chars) for _ in range(8))


# ── User ──────────────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.String(36),  primary_key=True, default=gen_id)
    full_name     = db.Column(db.String(120), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=True)
    phone         = db.Column(db.String(20),  unique=True, nullable=True)
    role          = db.Column(db.String(20),  nullable=False, default='buyer')  # buyer | seller | admin
    admin_level   = db.Column(db.String(20),  nullable=True)   # super_admin | admin (only for role=admin)
    password_hash = db.Column(db.String(256), nullable=True)
    otp_code      = db.Column(db.String(6),   nullable=True)
    otp_expires   = db.Column(db.DateTime,    nullable=True)
    is_active     = db.Column(db.Boolean,     default=True)
    is_verified   = db.Column(db.Boolean,     default=False)
    kyc_status    = db.Column(db.String(20),  default='pending')  # pending | submitted | approved | rejected
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)

    # Seller reputation (denormalised for speed)
    total_completed = db.Column(db.Integer, default=0)
    total_disputed  = db.Column(db.Integer, default=0)
    total_gmv       = db.Column(db.Float,   default=0.0)

    @property
    def reputation_score(self):
        total = self.total_completed + self.total_disputed
        if total == 0:
            return None
        return round((self.total_completed / total) * 5, 1)

    def to_dict(self, public=False):
        data = {
            'id':               self.id,
            'full_name':        self.full_name,
            'phone':            self.phone,
            'role':             self.role,
            'is_verified':      self.is_verified,
            'reputation_score': self.reputation_score,
            'total_completed':  self.total_completed,
            'created_at':       self.created_at.isoformat(),
        }
        if not public:
            data.update({
                'email':           self.email,
                'is_active':       self.is_active,
                'kyc_status':      self.kyc_status,
                'admin_level':     self.admin_level,
                'total_disputed':  self.total_disputed,
                'total_gmv':       self.total_gmv,
            })
        return data


# ── PaymentLink ───────────────────────────────────────────────────────────────

class PaymentLink(db.Model):
    __tablename__ = 'payment_links'

    id            = db.Column(db.String(36),  primary_key=True, default=gen_id)
    seller_id     = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=False)
    slug          = db.Column(db.String(20),  unique=True, nullable=False, default=gen_slug)
    title         = db.Column(db.String(200), nullable=False)
    description   = db.Column(db.Text,        nullable=True)
    link_type     = db.Column(db.String(20),  default='fixed')  # fixed | negotiable | milestone
    amount        = db.Column(db.Float,       nullable=True)    # None when negotiable
    min_amount    = db.Column(db.Float,       nullable=True)
    max_amount    = db.Column(db.Float,       nullable=True)
    delivery_days = db.Column(db.Integer,     default=7)
    is_active     = db.Column(db.Boolean,     default=True)
    views         = db.Column(db.Integer,     default=0)
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)
    expires_at    = db.Column(db.DateTime,    nullable=True)

    seller       = db.relationship('User', foreign_keys=[seller_id])
    transactions = db.relationship('Transaction', back_populates='payment_link', lazy='dynamic')
    milestones   = db.relationship('LinkMilestone', back_populates='link', cascade='all, delete-orphan')

    def to_dict(self, public=False):
        data = {
            'id':            self.id,
            'slug':          self.slug,
            'title':         self.title,
            'description':   self.description,
            'link_type':     self.link_type,
            'amount':        self.amount,
            'min_amount':    self.min_amount,
            'max_amount':    self.max_amount,
            'delivery_days': self.delivery_days,
            'is_active':     self.is_active,
            'created_at':    self.created_at.isoformat(),
            'milestones':    [m.to_dict() for m in self.milestones],
        }
        if public:
            data['seller'] = self.seller.to_dict(public=True)
        else:
            data['views']           = self.views
            data['paid_count']      = self.transactions.filter(Transaction.status.in_(['FUNDED','DELIVERED','COMPLETED'])).count()
            data['completed_count'] = self.transactions.filter(Transaction.status == 'COMPLETED').count()
        return data


# ── LinkMilestone ─────────────────────────────────────────────────────────────

class LinkMilestone(db.Model):
    __tablename__ = 'link_milestones'

    id          = db.Column(db.String(36),  primary_key=True, default=gen_id)
    link_id     = db.Column(db.String(36),  db.ForeignKey('payment_links.id'), nullable=False)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text,        nullable=True)
    amount      = db.Column(db.Float,       nullable=False)
    order       = db.Column(db.Integer,     default=0)

    link = db.relationship('PaymentLink', back_populates='milestones')

    def to_dict(self):
        return {
            'id':          self.id,
            'title':       self.title,
            'description': self.description,
            'amount':      self.amount,
            'order':       self.order,
        }


# ── Transaction ───────────────────────────────────────────────────────────────

class Transaction(db.Model):
    """
    Lifecycle: PENDING → FUNDED → DELIVERED → COMPLETED
                                ↘ DISPUTED  → REFUNDED | COMPLETED (admin)
               PENDING → CANCELLED (auto-expiry or manual)
    """
    __tablename__ = 'transactions'

    id               = db.Column(db.String(36),  primary_key=True, default=gen_id)
    reference        = db.Column(db.String(20),  unique=True, nullable=False, default=gen_ref)
    link_id          = db.Column(db.String(36),  db.ForeignKey('payment_links.id'), nullable=True)
    milestone_id     = db.Column(db.String(36),  db.ForeignKey('link_milestones.id'), nullable=True)
    buyer_id         = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=False)
    seller_id        = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=False)

    title            = db.Column(db.String(200), nullable=False)
    description      = db.Column(db.Text,        nullable=True)
    amount           = db.Column(db.Float,       nullable=False)
    platform_fee     = db.Column(db.Float,       nullable=False)
    seller_receives  = db.Column(db.Float,       nullable=False)

    status           = db.Column(db.String(30),  default='PENDING')
    payment_method   = db.Column(db.String(20),  nullable=True)            # mpesa | card
    mpesa_ref        = db.Column(db.String(50),  unique=True, nullable=True)
    mpesa_checkout_id = db.Column(db.String(100), nullable=True)            # CheckoutRequestID for callback matching
    paystack_ref     = db.Column(db.String(100), unique=True, nullable=True)

    delivery_proof_url = db.Column(db.String(256), nullable=True)
    delivery_notes     = db.Column(db.Text,        nullable=True)
    dispute_reason     = db.Column(db.Text,        nullable=True)
    admin_note         = db.Column(db.Text,        nullable=True)
    handled_by_id      = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=True)

    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    funded_at    = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    expires_at   = db.Column(db.DateTime, nullable=True)  # auto-cancel PENDING after this

    buyer        = db.relationship('User',        foreign_keys=[buyer_id])
    seller       = db.relationship('User',        foreign_keys=[seller_id])
    handler      = db.relationship('User',        foreign_keys=[handled_by_id])
    payment_link = db.relationship('PaymentLink', back_populates='transactions')
    messages     = db.relationship('Message',     back_populates='transaction', lazy='dynamic')

    def to_dict(self):
        return {
            'id':                  self.id,
            'reference':           self.reference,
            'title':               self.title,
            'description':         self.description,
            'amount':              self.amount,
            'platform_fee':        self.platform_fee,
            'seller_receives':     self.seller_receives,
            'status':              self.status,
            'payment_method':      self.payment_method,
            'mpesa_ref':           self.mpesa_ref,
            'delivery_proof_url':  self.delivery_proof_url,
            'delivery_notes':      self.delivery_notes,
            'dispute_reason':      self.dispute_reason,
            'admin_note':          self.admin_note,
            'handled_by':          self.handler.to_dict(public=True) if self.handler else None,
            'buyer':               self.buyer.to_dict(public=True),
            'seller':              self.seller.to_dict(public=True),
            'link_id':             self.link_id,
            'created_at':          self.created_at.isoformat(),
            'funded_at':           self.funded_at.isoformat()    if self.funded_at    else None,
            'delivered_at':        self.delivered_at.isoformat() if self.delivered_at else None,
            'completed_at':        self.completed_at.isoformat() if self.completed_at else None,
            'expires_at':          self.expires_at.isoformat()   if self.expires_at   else None,
        }


# ── Message ───────────────────────────────────────────────────────────────────

class Message(db.Model):
    __tablename__ = 'messages'

    id             = db.Column(db.String(36), primary_key=True, default=gen_id)
    transaction_id = db.Column(db.String(36), db.ForeignKey('transactions.id'), nullable=False)
    sender_id      = db.Column(db.String(36), db.ForeignKey('users.id'),        nullable=False)
    body           = db.Column(db.Text,       nullable=False)
    file_url       = db.Column(db.String(256), nullable=True)
    created_at     = db.Column(db.DateTime,   default=datetime.utcnow)

    transaction = db.relationship('Transaction', back_populates='messages')
    sender      = db.relationship('User')

    def to_dict(self):
        return {
            'id':             self.id,
            'transaction_id': self.transaction_id,
            'sender':         self.sender.to_dict(public=True),
            'body':           self.body,
            'file_url':       self.file_url,
            'created_at':     self.created_at.isoformat(),
        }


# ── BankAccount ───────────────────────────────────────────────────────────────

class BankAccount(db.Model):
    __tablename__ = 'bank_accounts'

    id             = db.Column(db.String(36),  primary_key=True, default=gen_id)
    user_id        = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=False)
    mpesa_phone    = db.Column(db.String(20),  nullable=True)
    bank_name      = db.Column(db.String(100), nullable=True)
    account_number = db.Column(db.String(30),  nullable=True)
    account_name   = db.Column(db.String(120), nullable=True)
    recipient_code = db.Column(db.String(100), nullable=True)  # Paystack transfer recipient code
    is_primary     = db.Column(db.Boolean,     default=True)
    created_at     = db.Column(db.DateTime,    default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id':             self.id,
            'mpesa_phone':    self.mpesa_phone,
            'bank_name':      self.bank_name,
            'account_number': ('****' + self.account_number[-4:]) if self.account_number else None,
            'account_name':   self.account_name,
            'is_primary':     self.is_primary,
        }


# ── WithdrawalRequest ─────────────────────────────────────────────────────────

class WithdrawalRequest(db.Model):
    __tablename__ = 'withdrawal_requests'

    id              = db.Column(db.String(36), primary_key=True, default=gen_id)
    seller_id       = db.Column(db.String(36), db.ForeignKey('users.id'),        nullable=False)
    bank_account_id = db.Column(db.String(36), db.ForeignKey('bank_accounts.id'), nullable=False)
    amount          = db.Column(db.Float,      nullable=False)
    status          = db.Column(db.String(20), default='pending')  # pending | approved | rejected | paid
    admin_note      = db.Column(db.Text,       nullable=True)
    handled_by_id   = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    transfer_ref    = db.Column(db.String(100), nullable=True)
    created_at      = db.Column(db.DateTime,   default=datetime.utcnow)
    resolved_at     = db.Column(db.DateTime,   nullable=True)

    seller       = db.relationship('User', foreign_keys=[seller_id])
    bank_account = db.relationship('BankAccount')
    handler      = db.relationship('User', foreign_keys=[handled_by_id])

    def to_dict(self):
        return {
            'id':            self.id,
            'seller':        self.seller.to_dict(public=True),
            'bank_account':  self.bank_account.to_dict(),
            'amount':        self.amount,
            'status':        self.status,
            'admin_note':    self.admin_note,
            'handled_by':    self.handler.to_dict(public=True) if self.handler else None,
            'created_at':    self.created_at.isoformat(),
            'resolved_at':   self.resolved_at.isoformat() if self.resolved_at else None,
        }


# ── PlatformSettings ──────────────────────────────────────────────────────────

class PlatformSettings(db.Model):
    __tablename__ = 'platform_settings'

    id    = db.Column(db.Integer,    primary_key=True)
    key   = db.Column(db.String(60), unique=True, nullable=False)
    value = db.Column(db.String(256), nullable=False)


# ── AdminActivity ─────────────────────────────────────────────────────────────

class AdminActivity(db.Model):
    """Audit log — every admin action is recorded here."""
    __tablename__ = 'admin_activity'

    id          = db.Column(db.String(36), primary_key=True, default=gen_id)
    admin_id    = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    action      = db.Column(db.String(60), nullable=False)   # e.g. 'resolve_dispute', 'ban_user'
    target_type = db.Column(db.String(40), nullable=True)    # e.g. 'transaction', 'user', 'withdrawal'
    target_id   = db.Column(db.String(36), nullable=True)
    detail      = db.Column(db.Text,       nullable=True)    # human-readable summary
    created_at  = db.Column(db.DateTime,   default=datetime.utcnow)

    admin = db.relationship('User', foreign_keys=[admin_id])

    def to_dict(self):
        return {
            'id':          self.id,
            'admin':       self.admin.to_dict(public=True),
            'action':      self.action,
            'target_type': self.target_type,
            'target_id':   self.target_id,
            'detail':      self.detail,
            'created_at':  self.created_at.isoformat(),
        }


# ── AdminInvite ───────────────────────────────────────────────────────────────

class AdminInvite(db.Model):
    """Email invitations for new admin accounts."""
    __tablename__ = 'admin_invites'

    id          = db.Column(db.String(36),  primary_key=True, default=gen_id)
    invited_by  = db.Column(db.String(36),  db.ForeignKey('users.id'), nullable=False)
    email       = db.Column(db.String(120), nullable=False)
    admin_level = db.Column(db.String(20),  default='admin')   # admin | super_admin
    token       = db.Column(db.String(64),  unique=True, nullable=False)
    used        = db.Column(db.Boolean,     default=False)
    expires_at  = db.Column(db.DateTime,    nullable=False)
    created_at  = db.Column(db.DateTime,    default=datetime.utcnow)

    inviter = db.relationship('User', foreign_keys=[invited_by])

    def to_dict(self):
        return {
            'id':          self.id,
            'email':       self.email,
            'admin_level': self.admin_level,
            'invited_by':  self.inviter.to_dict(public=True),
            'used':        self.used,
            'expires_at':  self.expires_at.isoformat(),
            'created_at':  self.created_at.isoformat(),
        }


# ── WaitlistEntry ─────────────────────────────────────────────────────────────

class WaitlistEntry(db.Model):
    """Waitlist signups from the landing page."""
    __tablename__ = 'waitlist'

    id         = db.Column(db.String(36),  primary_key=True, default=gen_id)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    name       = db.Column(db.String(120), nullable=True)
    role       = db.Column(db.String(20),  default='seller')  # seller | buyer | both
    created_at = db.Column(db.DateTime,    default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'email':      self.email,
            'name':       self.name,
            'role':       self.role,
            'created_at': self.created_at.isoformat(),
        }
