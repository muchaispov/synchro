"""
__init__.py — Synchro Flask application factory.

Creates and configures the Flask app, registers all blueprints,
serves the React frontend build, and exposes a health check + cron endpoint.
"""

import os
from flask import Flask, jsonify, request, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from app.models import db
from app.auth         import auth_bp,    bcrypt
from app.links        import links_bp
from app.transactions import tx_bp
from app.payments     import pay_bp
from app.seller       import seller_bp
from app.admin        import admin_bp


def create_app():
    app = Flask(__name__)

    # ── Config ────────────────────────────────────────────────────────────────
    db_url = os.getenv('DATABASE_URL', 'sqlite:///synchro.db')
    # Render uses postgres:// — SQLAlchemy 1.4+ requires postgresql://
    app.config['SQLALCHEMY_DATABASE_URI']        = db_url.replace('postgres://', 'postgresql://')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY']                 = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    app.config['MAX_CONTENT_LENGTH']             = 16 * 1024 * 1024  # 16 MB

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)
    CORS(app, resources={r'/api/*': {'origins': os.getenv('FRONTEND_URL', '*')}})

    # ── Blueprints ────────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp,    url_prefix='/api/auth')
    app.register_blueprint(links_bp,   url_prefix='/api/links')
    app.register_blueprint(tx_bp,      url_prefix='/api/transactions')
    app.register_blueprint(pay_bp,     url_prefix='/api/payments')
    app.register_blueprint(seller_bp,  url_prefix='/api/seller')
    app.register_blueprint(admin_bp,   url_prefix='/api/admin')

    # ── Utility routes ────────────────────────────────────────────────────────
    @app.get('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'synchro'})

    @app.post('/api/waitlist')
    def join_waitlist():
        from app.models import WaitlistEntry
        d     = request.get_json() or {}
        email = d.get('email', '').lower().strip()
        if not email or '@' not in email:
            return jsonify({'error': 'Valid email required'}), 400
        existing = WaitlistEntry.query.filter_by(email=email).first()
        if existing:
            return jsonify({'message': 'Already on the waitlist!', 'already': True})
        entry = WaitlistEntry(
            email = email,
            name  = d.get('name', '').strip(),
            role  = d.get('role', 'seller'),
        )
        db.session.add(entry)
        db.session.commit()
        return jsonify({'message': 'You\'re on the waitlist!', 'id': entry.id}), 201

    @app.get('/api/waitlist')
    def list_waitlist():
        # Admin only — basic secret header check
        if request.headers.get('X-Admin-Secret') != os.getenv('ADMIN_SEED_SECRET','changeme'):
            return jsonify({'error': 'Forbidden'}), 403
        from app.models import WaitlistEntry
        entries = WaitlistEntry.query.order_by(WaitlistEntry.created_at.desc()).all()
        return jsonify({'count': len(entries), 'entries': [e.to_dict() for e in entries]})

    @app.post('/api/cron/expire')
    def cron_expire():
        secret = request.headers.get('X-Cron-Secret', '')
        if secret != os.getenv('CRON_SECRET', 'changeme'):
            return jsonify({'error': 'Forbidden'}), 403
        from app.tasks import expire_pending_transactions
        count = expire_pending_transactions(app)
        return jsonify({'cancelled': count})

   # ── React SPA fallback ────────────────────────────────────────────────────
    static_dir = os.path.join(os.path.dirname(__file__), 'static')

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path.startswith('api/'):
            return jsonify({'error': 'Not found'}), 404
        full = os.path.join(static_dir, path)
        if path and os.path.exists(full):
            return send_from_directory(static_dir, path)
        return send_from_directory(static_dir, 'index.html')

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app