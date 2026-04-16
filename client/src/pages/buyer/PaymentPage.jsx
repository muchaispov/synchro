import { useState, useEffect } from 'react';
import { linksAPI, txAPI, payAPI, authAPI } from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Btn, Inp, Spinner, SynchroLogo, Card } from '../../components/UI';

function fmt(n) { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }

/* ── How escrow works ── */
function EscrowExplainer() {
  const steps = [
    { n:'01', title:'You pay into escrow',      body:'Your money is held securely — the seller cannot access it yet.' },
    { n:'02', title:'Seller delivers',           body:'The seller completes and delivers the order to you.' },
    { n:'03', title:'You confirm & release',     body:'Confirm you\'re happy. Funds are released to the seller.' },
  ];
  return (
    <div style={{ background:'var(--surface2)', borderRadius:'var(--rl)', border:'1px solid var(--border)', padding:'20px 22px', marginTop:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        How Synchro Escrow Works
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {steps.map(s => (
          <div key={s.n} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--gold)', opacity:.5, lineHeight:1, flexShrink:0 }}>{s.n}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{s.title}</div>
              <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── STK Push waiting screen ── */
function MpesaWaiting({ checkoutId, onSuccess, onCancel }) {
  const { toast } = useToast();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotIv   = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 600);
    const pollIv  = setInterval(async () => {
      try {
        const res = await payAPI.mpesaQuery({ checkout_request_id: checkoutId });
        if (res.ResultCode === 0) {
          clearInterval(pollIv); clearInterval(dotIv); onSuccess();
        } else if (res.ResultCode !== undefined && res.ResultCode !== 1032) {
          clearInterval(pollIv); clearInterval(dotIv);
          toast('M-Pesa payment cancelled or failed. Try again.', 'error');
          onCancel();
        }
      } catch(e) {}
    }, 3000);
    return () => { clearInterval(pollIv); clearInterval(dotIv); };
  }, [checkoutId]);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(8,10,14,.95)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn .2s ease' }}>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'2px solid rgba(34,197,94,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', animation:'goldPulse 2s ease infinite' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        </div>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:500, marginBottom:12 }}>Check your phone{dots}</h3>
        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:24 }}>
          Enter your <strong>M-Pesa PIN</strong> on the prompt sent to your phone to complete payment.
        </p>
        <Spinner size={20} color="var(--gold)" />
        <button onClick={onCancel} style={{ display:'block', margin:'20px auto 0', background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--text3)' }}>Cancel</button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { toast } = useToast();
  const slug      = window.location.pathname.split('/pay/')[1]?.split('?')[0];

  const [link,    setLink]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound,setNotFound]= useState(false);

  // Form
  const [name,   setName]   = useState('');
  const [phone,  setPhone]  = useState('');
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  // Payment state
  const [tx,      setTx]      = useState(null);
  const [mpesaId, setMpesaId] = useState(null);
  const [paid,    setPaid]    = useState(false);

  // Fetch link
  useEffect(() => {
    if (!slug) return;
    linksAPI.public(slug)
      .then(d => { setLink(d); if (d.amount) setAmount(String(d.amount)); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  async function silentBuyerAuth() {
    // Use a separate key for buyer tokens — never overwrite seller session
    const existing = localStorage.getItem('synchro_buyer_token');
    if (existing) {
      try {
        const prev = localStorage.getItem('synchro_token');
        localStorage.setItem('synchro_token', existing);
        const u = await authAPI.me();
        if (u.role === 'buyer') return true;
        // Not a buyer — restore seller token
        if (prev) localStorage.setItem('synchro_token', prev);
        else localStorage.removeItem('synchro_token');
      } catch(e) {}
    }
    try {
      const res = await authAPI.otpRequest({ phone: phone.trim(), full_name: name.trim() || 'Buyer' });
      if (res.debug_otp) {
        const verify = await authAPI.otpVerify({ phone: phone.trim(), otp: res.debug_otp });
        // Save buyer token under its own key — don't touch seller token
        localStorage.setItem('synchro_buyer_token', verify.token);
        localStorage.setItem('synchro_token', verify.token);
        return true;
      }
      return { needsOtp: true, channel: res.channel };
    } catch(e) {
      return false;
    }
  }

  async function payWithMpesa() {
    if (!name.trim()) return toast('Enter your name.', 'error');
    if (!phone.trim()) return toast('Enter your M-Pesa phone number.', 'error');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast('Enter a valid amount.', 'error');
    if (link.min_amount && amt < link.min_amount) return toast(`Minimum is ${fmt(link.min_amount)}.`, 'error');
    if (link.max_amount && amt > link.max_amount) return toast(`Maximum is ${fmt(link.max_amount)}.`, 'error');

    setPaying(true);
    try {
      // Get buyer session
      const authResult = await silentBuyerAuth();
      if (!authResult) { toast('Could not verify identity. Try again.', 'error'); setPaying(false); return; }

      // Create transaction
      const newTx = await txAPI.create({ link_id: link.id, amount: amt });
      setTx(newTx);

      // Initiate STK Push
      const res = await payAPI.mpesaInitiate(newTx.id, { phone: phone.trim() });
      setMpesaId(res.checkout_request_id);
    } catch(err) {
      toast(err.message, 'error');
      setPaying(false);
    }
  }

  async function payWithCard() {
    if (!name.trim()) return toast('Enter your name.', 'error');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast('Enter a valid amount.', 'error');

    setPaying(true);
    try {
      const authResult = await silentBuyerAuth();
      if (!authResult) { toast('Could not verify identity. Try again.', 'error'); setPaying(false); return; }

      const newTx = await txAPI.create({ link_id: link.id, amount: amt });
      setTx(newTx);
      const res = await payAPI.cardInitiate(newTx.id);
      window.location.href = res.authorization_url;
    } catch(err) {
      toast(err.message, 'error');
      setPaying(false);
    }
  }

  function handleMpesaSuccess() {
    setMpesaId(null); setPaying(false); setPaid(true);
    toast('Payment confirmed! Redirecting…', 'success');
    setTimeout(() => { window.location.href = `/track/${tx.reference}`; }, 2000);
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner size={28} color="var(--gold)" />
    </div>
  );

  if (notFound || !link) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <SynchroLogo size={48} />
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500, marginTop:24, marginBottom:8 }}>Link not found</h2>
      <p style={{ fontSize:13, color:'var(--text2)', textAlign:'center' }}>This payment link may have been removed or deactivated.</p>
    </div>
  );

  if (paid) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, animation:'fadeIn .4s ease' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'2px solid rgba(34,197,94,.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, animation:'goldPulse 2s ease infinite' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:500, marginBottom:8, textAlign:'center' }}>Payment received!</h2>
      <p style={{ fontSize:14, color:'var(--text2)', marginBottom:28, textAlign:'center' }}>Your funds are held securely in escrow.</p>
      <Btn onClick={() => window.location.href = `/track/${tx?.reference}`} size="lg">Track Your Order →</Btn>
    </div>
  );

  const fee      = Math.round(parseFloat(amount || 0) * 2.5 / 100);
  const receives = parseFloat(amount || 0) - fee;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {mpesaId && <MpesaWaiting checkoutId={mpesaId} onSuccess={handleMpesaSuccess} onCancel={() => { setMpesaId(null); setPaying(false); }} />}

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-15%', right:'-8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.04) 0%,transparent 70%)' }} />
      </div>

      <div style={{ maxWidth:520, margin:'0 auto', padding:'32px 20px 60px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
          <SynchroLogo size={28} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text2)' }}>Synchro Escrow</span>
        </div>

        {/* Seller card */}
        <Card style={{ padding:'20px 22px', marginBottom:16, animation:'fadeUp .4s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'linear-gradient(135deg,var(--gold),var(--gold-dim))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#080a0e', flexShrink:0 }}>
              {link.seller?.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{link.seller?.full_name}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                {link.seller?.is_verified && (
                  <span style={{ fontSize:10, fontWeight:700, color:'#4ade80', background:'rgba(34,197,94,.1)', padding:'1px 7px', borderRadius:4, border:'1px solid rgba(34,197,94,.2)', letterSpacing:'.06em', textTransform:'uppercase' }}>Verified</span>
                )}
                {link.seller?.reputation_score && (
                  <span style={{ fontSize:11, color:'var(--gold)', fontWeight:700 }}>★ {link.seller.reputation_score}</span>
                )}
                <span style={{ fontSize:11, color:'var(--text3)' }}>{link.seller?.total_completed || 0} completed</span>
              </div>
            </div>
          </div>
          <div style={{ height:1, background:'var(--border)', margin:'14px 0' }} />
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, marginBottom:8, lineHeight:1.3 }}>{link.title}</h2>
          {link.description && <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{link.description}</p>}
          {link.delivery_days && (
            <div style={{ marginTop:10, fontSize:11, color:'var(--text3)', display:'flex', alignItems:'center', gap:5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Delivery within {link.delivery_days} day{link.delivery_days !== 1 ? 's' : ''}
            </div>
          )}
        </Card>

        {/* Payment form */}
        <Card style={{ padding:'22px', animation:'fadeUp .4s .08s ease both' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:18 }}>Your Details</div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Inp label="Your Name" placeholder="Jane Wanjiku" value={name} onChange={e => setName(e.target.value)} required />
            <Inp label="M-Pesa Phone Number" placeholder="+254 7XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} required hint="STK Push will be sent to this number" />

            {/* Amount */}
            {link.link_type === 'fixed' ? (
              <div style={{ background:'var(--gold-subtle)', border:'1px solid var(--gold-border)', borderRadius:'var(--r)', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--gold)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>Amount</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:600, color:'var(--gold-light)' }}>{fmt(link.amount)}</div>
                </div>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity=".4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            ) : (
              <Inp
                label={`Amount (KES${link.min_amount ? ` · min ${fmt(link.min_amount)}` : ''}${link.max_amount ? ` · max ${fmt(link.max_amount)}` : ''})`}
                type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} prefix="KES" />
            )}

            {/* Fee breakdown */}
            {parseFloat(amount) > 0 && (
              <div style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 14px', display:'flex', gap:20, flexWrap:'wrap', border:'1px solid var(--border)' }}>
                {[['You pay', fmt(amount)], ['Platform fee', fmt(fee)], ['Seller gets', fmt(receives)]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pay buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}>
            <Btn full size="lg" loading={paying} onClick={payWithMpesa}
              style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', boxShadow:'0 4px 20px rgba(22,163,74,.3)', fontWeight:700, fontSize:15 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Pay with M-Pesa
            </Btn>
            <Btn full size="lg" variant="secondary" loading={paying} onClick={payWithCard}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Pay by Card
            </Btn>
          </div>
        </Card>

        <EscrowExplainer />

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
          Secured by <strong style={{ color:'var(--gold)' }}>Synchro</strong> · Your money is protected until you confirm delivery
        </div>
      </div>
    </div>
  );
}