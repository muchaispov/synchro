import { useState, useEffect, useRef } from 'react';
import { txAPI, payAPI, authAPI }       from '../../services/api';
import { useToast }   from '../../components/Toast';
import { Btn, Inp, Spinner, Badge, SynchroLogo, Card, Modal } from '../../components/UI';
import BuyerAuth from './BuyerAuth';

function fmt(n) { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : null; }

const STATUS_CONFIG = {
  PENDING:   { color:'#fbbf24', bg:'rgba(245,158,11,.08)',  icon:'⏳', label:'Awaiting Payment',    desc:'Your payment is pending.' },
  FUNDED:    { color:'#c9a84c', bg:'rgba(201,168,76,.08)',  icon:'🔒', label:'Payment Secured',     desc:'Your funds are held in escrow. Waiting for the seller to deliver.' },
  DELIVERED: { color:'#60a5fa', bg:'rgba(59,130,246,.08)',  icon:'📦', label:'Delivered',           desc:'The seller has marked this as delivered. Please confirm receipt or raise a dispute.' },
  COMPLETED: { color:'#4ade80', bg:'rgba(34,197,94,.08)',   icon:'✅', label:'Completed',           desc:'Transaction complete. Funds have been released to the seller.' },
  DISPUTED:  { color:'#f87171', bg:'rgba(239,68,68,.08)',   icon:'⚠️', label:'In Dispute',          desc:'A dispute has been raised. Our team will review within 48 hours.' },
  REFUNDED:  { color:'#c084fc', bg:'rgba(168,85,247,.08)',  icon:'↩️', label:'Refunded',            desc:'Funds have been returned to you.' },
  CANCELLED: { color:'#94a3b8', bg:'rgba(100,116,139,.08)', icon:'✕',  label:'Cancelled',           desc:'This transaction was cancelled.' },
};

/* ── Chat ── */
function Chat({ tx, currentUserId }) {
  const { toast } = useToast();
  const [msgs,    setMsgs]    = useState([]);
  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottom = useRef(null);

  useEffect(() => {
    txAPI.messages(tx.id).then(setMsgs).catch(e => toast(e.message,'error')).finally(() => setLoading(false));
  }, [tx.id]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try { const m = await txAPI.sendMsg(tx.id, { body: text.trim() }); setMsgs(p=>[...p,m]); setText(''); }
    catch(e) { toast(e.message,'error'); }
    finally { setSending(false); }
  }

  return (
    <Card style={{ overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Chat with Seller</div>
        <div style={{ fontSize:10, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase' }}>{msgs.length} message{msgs.length !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ height:300, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', marginTop:20 }}><Spinner size={20} color="var(--gold)" /></div>
        ) : msgs.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--text3)', fontSize:12, marginTop:40 }}>No messages yet. Ask the seller anything.</div>
        ) : msgs.map(m => {
          const mine = m.sender?.id === currentUserId;
          return (
            <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize:9, color:'var(--text3)', marginBottom:3 }}>{mine ? 'You' : m.sender?.full_name} · {fmtDate(m.created_at)}</div>
              <div style={{ maxWidth:'80%', padding:'9px 13px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? 'rgba(59,130,246,.12)' : 'var(--surface2)', border:`1px solid ${mine ? 'rgba(59,130,246,.25)' : 'var(--border)'}`, fontSize:13, lineHeight:1.5 }}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div style={{ padding:12, borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
          placeholder="Type a message to the seller…"
          style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 13px', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font-body)' }} />
        <Btn onClick={send} loading={sending} size="sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </Btn>
      </div>
    </Card>
  );
}

/* ── Dispute modal ── */
function DisputeModal({ tx, onDisputed, onClose }) {
  const { toast } = useToast();
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) return toast('Please describe the issue.', 'error');
    setLoading(true);
    try {
      const res = await txAPI.dispute(tx.id, { reason: reason.trim() });
      toast('Dispute raised. We\'ll review within 48 hours.', 'info');
      onDisputed(res);
    } catch(err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#f87171', lineHeight:1.6 }}>
        ⚠️ Only raise a dispute if there's a genuine issue. Disputes are reviewed by our team and may take up to 48 hours to resolve.
      </div>
      <Inp label="Describe the issue" textarea rows={4}
        placeholder="e.g. The seller has not delivered after 3 days, or the delivery was not what was agreed…"
        value={reason} onChange={e => setReason(e.target.value)} required />
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" variant="danger" loading={loading}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          Raise Dispute
        </Btn>
      </div>
    </form>
  );
}

export default function TrackPage() {
  const { toast } = useToast();
  const ref       = window.location.pathname.split('/track/')[1]?.split('?')[0];

  const [user,      setUser]      = useState(null);
  const [showAuth,  setShowAuth]  = useState(false);
  const [tx,        setTx]        = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disputeModal, setDisputeModal] = useState(false);

  // Check existing session
  useEffect(() => {
    // Check buyer token first, fall back to any token
    const tok = localStorage.getItem('synchro_buyer_token') || localStorage.getItem('synchro_token');
    if (tok) {
      localStorage.setItem('synchro_token', tok);
      authAPI.me()
        .then(u => { setUser(u); })
        .catch(() => { localStorage.removeItem('synchro_buyer_token'); setShowAuth(true); setLoading(false); });
    } else {
      setShowAuth(true);
      setLoading(false);
    }
  }, []);

  // Fetch transaction once we have a user
  useEffect(() => {
    if (!user || !ref) return;
    setLoading(true);

    // Handle Paystack card redirect verification
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify') === '1') {
      payAPI.cardVerify(ref).catch(() => {});
    }

    txAPI.byRef(ref)
      .then(setTx)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [user, ref]);

  function handleVerified(tok, u) {
    setUser(u);
    setShowAuth(false);
  }

  async function confirmReceipt() {
    if (!window.confirm('Confirm you have received the delivery? This will release payment to the seller.')) return;
    setConfirming(true);
    try {
      const res = await txAPI.confirm(tx.id);
      setTx(res);
      toast('Confirmed! Funds released to the seller. Thank you.', 'success');
    } catch(err) { toast(err.message, 'error'); }
    finally { setConfirming(false); }
  }

  function handleDisputed(updated) {
    setTx(updated);
    setDisputeModal(false);
  }

  // Timeline
  const TIMELINE = tx ? [
    { label:'Order Created',        date: tx.created_at,   done: true },
    { label:'Payment Secured',      date: tx.funded_at,    done: ['FUNDED','DELIVERED','COMPLETED','DISPUTED','REFUNDED'].includes(tx.status) },
    { label:'Delivered by Seller',  date: tx.delivered_at, done: ['DELIVERED','COMPLETED','DISPUTED'].includes(tx.status) },
    { label:'Receipt Confirmed',    date: tx.completed_at, done: tx.status === 'COMPLETED' },
  ] : [];

  // ── Render states ──────────────────────────────────────────────────────────

  if (showAuth) return <BuyerAuth onVerified={handleVerified} context="track" />;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <SynchroLogo size={40} />
      <Spinner size={24} color="var(--gold)" />
    </div>
  );

  if (notFound || !tx) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <SynchroLogo size={48} />
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500, marginTop:24, marginBottom:8 }}>Order not found</h2>
      <p style={{ fontSize:13, color:'var(--text2)', textAlign:'center' }}>This reference number doesn't match any order in your account.</p>
    </div>
  );

  const sc = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', position:'relative' }}>

      {/* Background glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.03) 0%,transparent 70%)' }} />
      </div>

      <div style={{ maxWidth:580, margin:'0 auto', padding:'32px 20px 60px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
          <SynchroLogo size={28} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text2)' }}>Order Tracker</span>
          <button onClick={() => { localStorage.removeItem('synchro_token'); window.location.reload(); }}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--text3)' }}>
            Sign out
          </button>
        </div>

        {/* Status hero */}
        <div style={{ background:sc.bg, border:`1px solid ${sc.color}33`, borderRadius:'var(--rxl)', padding:'28px 26px', marginBottom:20, animation:'fadeUp .4s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
            <span style={{ fontSize:32 }}>{sc.icon}</span>
            <div>
              <div style={{ fontSize:11, color:sc.color, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>Status</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:600, color:'var(--text)', lineHeight:1 }}>{sc.label}</div>
            </div>
          </div>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{sc.desc}</p>

          {/* Reference */}
          <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.2)', borderRadius:8, padding:'7px 12px', width:'fit-content' }}>
            <span style={{ fontSize:10, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase' }}>Ref</span>
            <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--text)', fontWeight:700 }}>{tx.reference}</span>
          </div>
        </div>

        {/* CTA — Delivered state */}
        {tx.status === 'DELIVERED' && (
          <div style={{ background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.25)', borderRadius:'var(--rl)', padding:'20px 22px', marginBottom:20, animation:'fadeUp .35s .05s ease both' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#4ade80', marginBottom:6 }}>📦 Your order has been delivered!</div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, marginBottom:16 }}>
              The seller has marked this order as delivered
              {tx.delivery_notes ? `: "${tx.delivery_notes}"` : '.'}<br/>
              {tx.delivery_proof_url && <a href={tx.delivery_proof_url} target="_blank" rel="noreferrer" style={{ color:'#4ade80', fontSize:12 }}>View proof of delivery →</a>}
            </p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <Btn variant="success" loading={confirming} onClick={confirmReceipt} size="lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Confirm Receipt & Release Payment
              </Btn>
              <Btn variant="ghost" size="lg" onClick={() => setDisputeModal(true)}>
                Raise a Dispute
              </Btn>
            </div>
          </div>
        )}

        {/* CTA — Funded, no action yet */}
        {tx.status === 'FUNDED' && (
          <div style={{ background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'var(--rl)', padding:'16px 20px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, animation:'fadeUp .35s .05s ease both' }}>
            <p style={{ fontSize:12, color:'#fbbf24', margin:0 }}>Waiting for the seller to deliver. You'll be notified via SMS/email.</p>
            <Btn variant="danger" size="sm" onClick={() => setDisputeModal(true)}>Raise Dispute</Btn>
          </div>
        )}

        {/* Amount breakdown */}
        <Card style={{ padding:'18px 20px', marginBottom:16, animation:'fadeUp .4s .1s ease both' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            {[
              { label:'You paid',        val: fmt(tx.amount),          bold: true },
              { label:'Platform fee',    val: fmt(tx.platform_fee),    bold: false },
              { label:'Seller receives', val: fmt(tx.seller_receives), bold: false },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5 }}>{s.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, color: s.bold ? 'var(--text)' : 'var(--text2)' }}>{s.val}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Seller info */}
        <Card style={{ padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:12, animation:'fadeUp .4s .15s ease both' }}>
          <div style={{ width:38, height:38, borderRadius:9, background:'linear-gradient(135deg,var(--gold),var(--gold-dim))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#080a0e', flexShrink:0 }}>
            {tx.seller?.full_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:1 }}>{tx.seller?.full_name}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>Seller · {tx.title}</div>
          </div>
          <Badge status={tx.status} />
        </Card>

        {/* Timeline */}
        <Card style={{ padding:'18px 20px', marginBottom:16, animation:'fadeUp .4s .2s ease both' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:16 }}>Order Timeline</div>
          {TIMELINE.map((step, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${step.done ? 'var(--gold)' : 'var(--border2)'}`, background: step.done ? 'var(--gold-subtle)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {step.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                {i < TIMELINE.length - 1 && <div style={{ width:1, height:26, background: step.done ? 'var(--gold-border)' : 'var(--border)', margin:'2px 0' }} />}
              </div>
              <div style={{ paddingBottom: i < TIMELINE.length-1 ? 8 : 0, paddingTop:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color: step.done ? 'var(--text)' : 'var(--text3)' }}>{step.label}</div>
                {step.date && <div style={{ fontSize:10, color:'var(--text3)' }}>{fmtDate(step.date)}</div>}
              </div>
            </div>
          ))}
        </Card>

        {/* Dispute info if raised */}
        {tx.dispute_reason && (
          <Card style={{ padding:'16px 20px', marginBottom:16, border:'1px solid rgba(239,68,68,.2)', animation:'fadeUp .4s .25s ease both' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#f87171', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:8 }}>Dispute Raised</div>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{tx.dispute_reason}</p>
            {tx.admin_note && <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(239,68,68,.1)', fontSize:12, color:'var(--text3)' }}>Admin note: {tx.admin_note}</div>}
          </Card>
        )}

        {/* Chat */}
        {['FUNDED','DELIVERED','DISPUTED'].includes(tx.status) && (
          <div style={{ animation:'fadeUp .4s .3s ease both' }}>
            <Chat tx={tx} currentUserId={user?.id} />
          </div>
        )}

        {/* Help footer */}
        <div style={{ textAlign:'center', marginTop:28, fontSize:11, color:'var(--text3)', lineHeight:1.8 }}>
          Need help? Contact <a href="mailto:support@synchro.co.ke" style={{ color:'var(--gold)' }}>support@synchro.co.ke</a><br/>
          Reference: <span style={{ fontFamily:'monospace' }}>{tx.reference}</span>
        </div>
      </div>

      {/* Dispute modal */}
      <Modal open={disputeModal} onClose={() => setDisputeModal(false)} title="Raise a Dispute">
        <DisputeModal tx={tx} onDisputed={handleDisputed} onClose={() => setDisputeModal(false)} />
      </Modal>
    </div>
  );
}