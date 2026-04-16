"""
tasks.py — Background / cron tasks.

expire_pending_transactions(app):
  Auto-cancels PENDING transactions whose expires_at has passed.
  Call hourly via POST /api/cron/expire (secured with X-Cron-Secret header).
"""

from datetime import datetime
from app.models import db, Transaction


def expire_pending_transactions(app) -> int:
    """
    Cancel all PENDING transactions past their expiry.
    Returns the number of transactions cancelled.
    Must be called within an app context.
    """
    with app.app_context():
        now     = datetime.utcnow()
        expired = Transaction.query.filter(
            Transaction.status    == 'PENDING',
            Transaction.expires_at != None,
            Transaction.expires_at <= now,
        ).all()

        count = 0
        for tx in expired:
            tx.status = 'CANCELLED'
            count += 1

        if count:
            db.session.commit()
            print(f"[CRON] Auto-cancelled {count} expired transaction(s)")

        return count