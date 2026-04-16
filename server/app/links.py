"""
links.py — Payment link management routes.

Endpoints:
  POST   /api/links                  — create a new link (seller)
  GET    /api/links                  — list seller's own links
  GET    /api/links/<id>             — get a single link (seller)
  PATCH  /api/links/<id>             — update a link (seller)
  DELETE /api/links/<id>             — delete a link (seller)
  GET    /api/links/<id>/stats       — conversion stats for a link (seller)
  GET    /api/links/public/<slug>    — public: fetch link by slug (buyer landing)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, PaymentLink, LinkMilestone, Transaction

links_bp = Blueprint('links', __name__)


def _err(msg, code=400):
    return jsonify({'error': msg}), code

def _require_seller():
    uid = get_jwt_identity()
    u   = User.query.get(uid)
    if not u or u.role != 'seller':
        return None, _err('Seller account required', 403)
    return u, None


# ── create ────────────────────────────────────────────────────────────────────

@links_bp.post('')
@jwt_required()
def create_link():
    u, err = _require_seller()
    if err: return err

    d = request.get_json() or {}
    if not d.get('title'):
        return _err('title is required')

    link = PaymentLink(
        seller_id     = u.id,
        title         = d['title'].strip(),
        description   = d.get('description'),
        link_type     = d.get('link_type', 'fixed'),
        amount        = float(d['amount'])     if d.get('amount')     else None,
        min_amount    = float(d['min_amount']) if d.get('min_amount') else None,
        max_amount    = float(d['max_amount']) if d.get('max_amount') else None,
        delivery_days = int(d.get('delivery_days', 7)),
    )
    db.session.add(link)
    db.session.flush()  # get link.id before adding milestones

    if link.link_type == 'milestone':
        milestones = d.get('milestones', [])
        if not milestones:
            return _err('At least one milestone is required for milestone-type links')
        for i, ms in enumerate(milestones):
            if not ms.get('title') or not ms.get('amount'):
                return _err(f'Milestone {i+1} must have a title and amount')
            db.session.add(LinkMilestone(
                link_id     = link.id,
                title       = ms['title'].strip(),
                description = ms.get('description'),
                amount      = float(ms['amount']),
                order       = i,
            ))

    db.session.commit()
    return jsonify(link.to_dict()), 201


# ── list (seller's own) ───────────────────────────────────────────────────────

@links_bp.get('')
@jwt_required()
def list_links():
    u, err = _require_seller()
    if err: return err
    links = PaymentLink.query.filter_by(seller_id=u.id).order_by(PaymentLink.created_at.desc()).all()
    return jsonify([l.to_dict() for l in links])


# ── get single ───────────────────────────────────────────────────────────────

@links_bp.get('/<link_id>')
@jwt_required()
def get_link(link_id):
    u, err = _require_seller()
    if err: return err
    link = PaymentLink.query.get_or_404(link_id)
    if link.seller_id != u.id:
        return _err('Forbidden', 403)
    return jsonify(link.to_dict())


# ── update ────────────────────────────────────────────────────────────────────

@links_bp.patch('/<link_id>')
@jwt_required()
def update_link(link_id):
    u, err = _require_seller()
    if err: return err
    link = PaymentLink.query.get_or_404(link_id)
    if link.seller_id != u.id:
        return _err('Forbidden', 403)

    d = request.get_json() or {}
    for field in ('title', 'description', 'amount', 'min_amount', 'max_amount', 'delivery_days', 'is_active'):
        if field in d:
            setattr(link, field, d[field])

    db.session.commit()
    return jsonify(link.to_dict())


# ── delete ────────────────────────────────────────────────────────────────────

@links_bp.delete('/<link_id>')
@jwt_required()
def delete_link(link_id):
    u, err = _require_seller()
    if err: return err
    link = PaymentLink.query.get_or_404(link_id)
    if link.seller_id != u.id:
        return _err('Forbidden', 403)
    db.session.delete(link)
    db.session.commit()
    return jsonify({'message': 'Link deleted'})


# ── stats ─────────────────────────────────────────────────────────────────────

@links_bp.get('/<link_id>/stats')
@jwt_required()
def link_stats(link_id):
    u, err = _require_seller()
    if err: return err
    link = PaymentLink.query.get_or_404(link_id)
    if link.seller_id != u.id:
        return _err('Forbidden', 403)

    txs           = link.transactions.all()
    total_revenue = sum(t.seller_receives for t in txs if t.status == 'COMPLETED')

    return jsonify({
        'views':             link.views,
        'total_transactions': len(txs),
        'completed':         sum(1 for t in txs if t.status == 'COMPLETED'),
        'funded':            sum(1 for t in txs if t.status == 'FUNDED'),
        'pending':           sum(1 for t in txs if t.status == 'PENDING'),
        'disputed':          sum(1 for t in txs if t.status == 'DISPUTED'),
        'total_revenue':     total_revenue,
        'conversion_rate':   round(len(txs) / link.views * 100, 1) if link.views else 0,
    })


# ── public: buyer landing ─────────────────────────────────────────────────────

@links_bp.get('/public/<slug>')
def public_link(slug):
    link = PaymentLink.query.filter_by(slug=slug, is_active=True).first()
    if not link:
        return _err('Payment link not found or no longer active', 404)
    link.views += 1
    db.session.commit()
    return jsonify(link.to_dict(public=True))