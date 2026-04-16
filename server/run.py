"""
run.py — Application entry point.

Development:  python run.py
Production:   gunicorn run:app --workers 2 --bind 0.0.0.0:$PORT --timeout 120
"""
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.models import db

app = create_app()

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)