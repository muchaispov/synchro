import { useState } from 'react';
import { authAPI }   from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Btn, Inp, SynchroLogo } from '../../components/UI';

/**
 * BuyerAuth
 * Shown as an overlay when a buyer needs to verify before paying or tracking.
 * Supports phone number OR email address, sends OTP, verifies, returns JWT.
 *
 * Props:
 *   onVerified(token, user) — called after successful verification
 *   context — 'pay' | 'track'  (changes copy slightly)
 */
export default function BuyerAuth({ onVerified, context = 'pay' }) {
  const { toast }   = useToast();
  const [step,      setStep]      = useState('contact'); // contact | otp
  const [contact,   setContact]   = useState('');
  const [name,      setName]      = useState('');
  const [otp,       setOtp]       = useState('');
  const [channel,   setChannel]   = useState(''); // 'phone' | 'email'
  const [loading,   setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  const isEmail = v => v.includes('@') && v.split('@')[1]?.includes('.');

  function startCountdown() {
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
  }

  async function requestOtp(e) {
    e.preventDefault();
    if (!contact.trim()) return toast('Enter your phone number or email.', 'error');
    setLoading(true);
    try {
      const payload = isEmail(contact)
        ? { email: contact.trim(), full_name: name.trim() || 'Buyer' }
        : { phone: contact.trim(), full_name: name.trim() || 'Buyer' };
      const res = await authAPI.otpRequest(payload);
      setChannel(res.channel);
      setStep('otp');
      startCountdown();
      toast(`OTP sent to your ${res.channel}.`, 'success');
    } catch(err) {
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (otp.length !== 6) return toast('Enter the 6-digit code.', 'error');
    setLoading(true);
    try {
      const payload = isEmail(contact)
        ? { email: contact.trim(), otp }
        : { phone: contact.trim(), otp };
      const res = await authAPI.otpVerify(payload);
      localStorage.setItem('synchro_token', res.token);
      toast('Identity verified.', 'success');
      onVerified(res.token, res.user);
    } catch(err) {
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function resend() {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const payload = isEmail(contact)
        ? { email: contact.trim(), full_name: name.trim() || 'Buyer' }
        : { phone: contact.trim(), full_name: name.trim() || 'Buyer' };
      await authAPI.otpRequest(payload);
      startCountdown();
      toast('New OTP sent.', 'info');
    } catch(err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:800, background:'rgba(8,10,14,.95)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn .25s ease' }}>
      <div style={{ width:'100%', maxWidth:420, animation:'scaleIn .3s cubic-bezier(.34,1.2,.64,1)' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:36 }}>
          <SynchroLogo size={32} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Synchro</span>
        </div>

        {step === 'contact' ? (
          <>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:500, lineHeight:1.2, marginBottom:8 }}>
              {context === 'pay' ? 'Verify your identity.' : 'Sign in to track your order.'}
            </h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:32, lineHeight:1.6 }}>
              {context === 'pay'
                ? "We'll send a one-time code to confirm it's you before processing payment."
                : "Enter your phone or email to access your order."}
            </p>

            <form onSubmit={requestOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Inp
                label="Your Name"
                placeholder="Jane Wanjiku"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Inp
                label="Phone Number or Email"
                placeholder="+254 7XX XXX XXX or jane@example.com"
                value={contact}
                onChange={e => setContact(e.target.value)}
                required
                hint="We'll send a 6-digit code to verify you"
              />
              <Btn type="submit" full loading={loading} size="lg" style={{ marginTop:4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 011 1.18 2 2 0 013 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91A16 16 0 0013 13.89l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.5v2.42z"/></svg>
                Send Verification Code
              </Btn>
            </form>

            {/* Security note */}
            <div style={{ marginTop:24, display:'flex', alignItems:'flex-start', gap:10, background:'rgba(201,168,76,.05)', border:'1px solid var(--gold-border)', borderRadius:10, padding:'12px 14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <p style={{ fontSize:11, color:'var(--text3)', lineHeight:1.6, margin:0 }}>
                Your payment is held securely in escrow and only released when you confirm the order is complete.
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:500, lineHeight:1.2, marginBottom:8 }}>
              Enter your code.
            </h2>
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:8, lineHeight:1.6 }}>
              We sent a 6-digit code to <strong style={{ color:'var(--text)' }}>{contact}</strong>.
            </p>
            <p style={{ fontSize:12, color:'var(--text3)', marginBottom:32 }}>
              Check your {channel === 'email' ? 'inbox (and spam folder)' : 'SMS messages'}.
            </p>

            <form onSubmit={verifyOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Big OTP input */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--text2)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>Verification Code</label>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  maxLength={6}
                  placeholder="000000"
                  style={{ width:'100%', textAlign:'center', fontSize:32, fontWeight:700, letterSpacing:12, padding:'16px', background:'var(--surface2)', border:'1px solid var(--gold-border)', borderRadius:'var(--r)', color:'var(--gold-light)', outline:'none', fontFamily:'monospace', boxShadow:'0 0 0 3px rgba(201,168,76,.06)' }}
                />
              </div>

              <Btn type="submit" full loading={loading} size="lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Verify & Continue
              </Btn>
            </form>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
              <button onClick={() => { setStep('contact'); setOtp(''); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--text3)' }}>
                ← Change contact
              </button>
              <button onClick={resend} disabled={countdown > 0} style={{ background:'none', border:'none', cursor: countdown > 0 ? 'default' : 'pointer', fontSize:12, color: countdown > 0 ? 'var(--text3)' : 'var(--gold)', fontWeight:600 }}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}