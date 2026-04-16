"""
email_service.py — Email delivery for OTP and notifications.

Uses Python's built-in smtplib — works with Gmail (App Password),
SendGrid SMTP relay, Mailgun, or any standard SMTP provider.

Required env vars:
  SMTP_HOST        e.g. smtp.gmail.com
  SMTP_PORT        e.g. 587
  SMTP_USER        your sending email address
  SMTP_PASSWORD    app password or API key
  SMTP_FROM_NAME   e.g. Synchro
  SMTP_FROM_EMAIL  e.g. noreply@synchro.co.ke (can match SMTP_USER)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def _build_otp_html(otp: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080a0e;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0e;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#10141b;border:1px solid rgba(201,168,76,.2);border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0c0f14,#161c25);padding:32px;text-align:center;border-bottom:1px solid rgba(201,168,76,.15);">
            <div style="font-size:28px;font-weight:700;color:#c9a84c;letter-spacing:.05em;font-family:Georgia,serif;">SYNCHRO</div>
            <div style="font-size:12px;color:#6b7a94;margin-top:4px;letter-spacing:.12em;text-transform:uppercase;">Secure Escrow · Kenya</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 36px;">
            <p style="font-size:15px;color:#e8edf5;margin:0 0 24px;line-height:1.6;">
              Your Synchro verification code is:
            </p>

            <!-- OTP box -->
            <div style="background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
              <div style="font-size:42px;font-weight:700;letter-spacing:16px;color:#e8c86a;font-family:monospace;">{otp}</div>
              <div style="font-size:11px;color:#6b7a94;margin-top:10px;letter-spacing:.06em;text-transform:uppercase;">Valid for 10 minutes</div>
            </div>

            <p style="font-size:13px;color:#6b7a94;margin:0;line-height:1.7;">
              Do not share this code with anyone. Synchro will never ask for your OTP via phone or chat.<br><br>
              If you did not request this code, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0c0f14;padding:20px 36px;border-top:1px solid #1a2030;">
            <p style="font-size:11px;color:#35425a;margin:0;text-align:center;letter-spacing:.04em;">
              © 2025 Synchro · Nairobi, Kenya · This is an automated message
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_otp_email(to_email: str, otp: str, name: str = 'there') -> dict:
    """
    Send an OTP verification email.
    Returns {'sent': True} on success or {'error': str} on failure.
    Falls back to console log if SMTP not configured.
    """
    smtp_host  = os.getenv('SMTP_HOST')
    smtp_user  = os.getenv('SMTP_USER')
    smtp_pass  = os.getenv('SMTP_PASSWORD')

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[EMAIL MOCK] OTP {otp} → {to_email}")
        return {'mock': True, 'email': to_email, 'otp': otp}

    from_name  = os.getenv('SMTP_FROM_NAME',  'Synchro')
    from_email = os.getenv('SMTP_FROM_EMAIL',  smtp_user)
    smtp_port  = int(os.getenv('SMTP_PORT', '587'))

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"{otp} is your Synchro verification code"
    msg['From']    = f"{from_name} <{from_email}>"
    msg['To']      = to_email

    # Plain text fallback
    plain = f"Your Synchro verification code is: {otp}\n\nValid for 10 minutes. Do not share this code with anyone."
    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(_build_otp_html(otp), 'html'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return {'sent': True}
    except Exception as e:
        print(f"[EMAIL ERROR] {to_email}: {e}")
        return {'error': str(e)}


def send_notification_email(to_email: str, subject: str, body_html: str) -> dict:
    """Send a generic notification email."""
    smtp_host = os.getenv('SMTP_HOST')
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASSWORD')

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[EMAIL MOCK] {subject} → {to_email}")
        return {'mock': True}

    from_name  = os.getenv('SMTP_FROM_NAME',  'Synchro')
    from_email = os.getenv('SMTP_FROM_EMAIL',  smtp_user)
    smtp_port  = int(os.getenv('SMTP_PORT', '587'))

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f"{from_name} <{from_email}>"
    msg['To']      = to_email
    msg.attach(MIMEText(body_html, 'html'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return {'sent': True}
    except Exception as e:
        print(f"[EMAIL ERROR] {to_email}: {e}")
        return {'error': str(e)}
