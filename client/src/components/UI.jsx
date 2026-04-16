import { useState, forwardRef } from 'react';

/* ── Logo ──────────────────────────────────────────────────────────────────── */
export function SynchroLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill="rgba(201,168,76,.08)" stroke="rgba(201,168,76,.2)" strokeWidth="1"/>
      <path d="M12 20 C12 14.5 15.8 11 20 11 C24.2 11 28 14.5 28 20" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M28 20 C28 25.5 24.2 29 20 29 C15.8 29 12 25.5 12 20" stroke="#a8863a" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="20" cy="20" r="3" fill="#c9a84c"/>
    </svg>
  );
}

/* ── Spinner ───────────────────────────────────────────────────────────────── */
export function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ animation:'spin .75s linear infinite', flexShrink:0 }}>
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  );
}

/* ── Button ────────────────────────────────────────────────────────────────── */
export function Btn({ children, variant='primary', size='md', loading, disabled, onClick, full, style, type='button' }) {
  const [hov, setHov] = useState(false);

  const sizes = {
    sm: { padding:'7px 14px',  fontSize:12 },
    md: { padding:'11px 22px', fontSize:13 },
    lg: { padding:'14px 30px', fontSize:14 },
  };

  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7,
    fontWeight:600, cursor:(disabled||loading)?'not-allowed':'pointer',
    borderRadius:'var(--r)', transition:'all .2s cubic-bezier(.34,1.2,.64,1)',
    opacity:(disabled||loading)?.45:1, width:full?'100%':undefined,
    letterSpacing:'.02em', lineHeight:1, ...sizes[size],
  };

  const variants = {
    primary: { background: hov ? 'linear-gradient(135deg,#e8c86a,#c9a84c)' : 'linear-gradient(135deg,#c9a84c,#a8863a)', color:'#080a0e', fontWeight:700, border:'none', boxShadow: hov ? '0 8px 32px rgba(201,168,76,.4)' : '0 4px 16px rgba(201,168,76,.2)', transform: hov ? 'translateY(-1px)' : 'none' },
    secondary: { background: hov ? 'var(--surface3)' : 'var(--surface2)', color:'var(--text)', border:'1px solid var(--border2)', transform: hov ? 'translateY(-1px)' : 'none' },
    ghost:   { background:'transparent', color: hov ? 'var(--text)' : 'var(--text2)', border:'1px solid var(--border)' },
    gold:    { background:'transparent', color: hov ? 'var(--gold-light)' : 'var(--gold)', border:'1px solid var(--gold-border)', boxShadow: hov ? '0 0 20px rgba(201,168,76,.15)' : 'none' },
    danger:  { background: hov ? 'rgba(239,68,68,.15)' : 'rgba(239,68,68,.08)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' },
    success: { background: hov ? 'rgba(34,197,94,.15)' : 'rgba(34,197,94,.08)', color:'#4ade80', border:'1px solid rgba(34,197,94,.25)' },
  };

  return (
    <button type={type} disabled={disabled||loading} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {loading && <Spinner size={13} />}
      {children}
    </button>
  );
}

/* ── Input ─────────────────────────────────────────────────────────────────── */
export const Inp = forwardRef(({ label, error, hint, prefix, suffix, textarea, rows=3, ...p }, ref) => {
  const [foc, setFoc] = useState(false);
  const El = textarea ? 'textarea' : 'input';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <label style={{ fontSize:11, fontWeight:600, color: foc ? 'var(--gold)' : 'var(--text2)', letterSpacing:'.08em', textTransform:'uppercase', transition:'color .2s' }}>{label}</label>}
      <div style={{ display:'flex', alignItems: textarea ? 'flex-start' : 'center', background:'var(--surface2)', borderRadius:'var(--r)', border:`1px solid ${error ? 'rgba(239,68,68,.5)' : foc ? 'var(--gold-border)' : 'var(--border)'}`, transition:'border-color .2s, box-shadow .2s', boxShadow: foc ? '0 0 0 3px rgba(201,168,76,.06)' : 'none' }}>
        {prefix && <span style={{ paddingLeft:13, color:'var(--text3)', fontSize:13, flexShrink:0 }}>{prefix}</span>}
        <El ref={ref} {...p} rows={textarea ? rows : undefined}
          onFocus={e => { setFoc(true);  p.onFocus?.(e); }}
          onBlur={e  => { setFoc(false); p.onBlur?.(e);  }}
          style={{ flex:1, padding:'11px 13px', background:'none', border:'none', outline:'none', color:'var(--text)', fontSize:13, fontFamily:'var(--font-body)', resize: textarea ? 'vertical' : undefined, ...(prefix ? { paddingLeft:6 } : {}) }}
        />
        {suffix && <span style={{ paddingRight:13, color:'var(--text3)', fontSize:13, flexShrink:0 }}>{suffix}</span>}
      </div>
      {error && <span style={{ fontSize:11, color:'#f87171' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>{hint}</span>}
    </div>
  );
});

/* ── Card ──────────────────────────────────────────────────────────────────── */
export function Card({ children, style, hover, gold, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{ background:'var(--surface)', borderRadius:'var(--rl)', border:`1px solid ${hov||gold ? 'var(--gold-border)' : 'var(--border)'}`, transition:'all .25s', boxShadow: gold ? '0 0 32px rgba(201,168,76,.1)' : hov && hover ? '0 12px 40px rgba(0,0,0,.5)' : 'none', transform: hov && hover ? 'translateY(-2px)' : 'none', cursor: onClick ? 'pointer' : undefined, ...style }}>
      {children}
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(8,10,14,.92)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', borderRadius:'var(--rxl)', border:'1px solid var(--gold-border)', width:'100%', maxWidth: wide ? 640 : 460, boxShadow:'0 32px 80px rgba(0,0,0,.8), 0 0 60px rgba(201,168,76,.06)', animation:'scaleIn .28s cubic-bezier(.34,1.2,.64,1)' }}>
        {title && (
          <div style={{ padding:'22px 26px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, letterSpacing:'.01em' }}>{title}</h3>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4, display:'flex', borderRadius:7 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        <div style={{ padding:26 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────────────── */
const BADGE_MAP = {
  PENDING:   { bg:'rgba(245,158,11,.1)',  color:'#fbbf24', dot:'#f59e0b' },
  FUNDED:    { bg:'rgba(201,168,76,.1)',  color:'#e8c86a', dot:'#c9a84c' },
  DELIVERED: { bg:'rgba(59,130,246,.1)',  color:'#60a5fa', dot:'#3b82f6' },
  COMPLETED: { bg:'rgba(34,197,94,.1)',   color:'#4ade80', dot:'#22c55e' },
  DISPUTED:  { bg:'rgba(239,68,68,.1)',   color:'#f87171', dot:'#ef4444' },
  REFUNDED:  { bg:'rgba(168,85,247,.1)',  color:'#c084fc', dot:'#a855f7' },
  CANCELLED: { bg:'rgba(100,116,139,.1)', color:'#94a3b8', dot:'#64748b' },
};

export function Badge({ status }) {
  const s = BADGE_MAP[status] || BADGE_MAP.CANCELLED;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:s.bg, color:s.color, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
      {status}
    </span>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────────── */
export function Skeleton({ w='100%', h=14, r=6, style }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:'linear-gradient(90deg,var(--surface2) 25%,var(--surface3) 50%,var(--surface2) 75%)', backgroundSize:'600px 100%', animation:'shimmer 1.8s ease infinite', ...style }} />;
}

/* ── StatCard ──────────────────────────────────────────────────────────────── */
export function StatCard({ label, value, sub, gold, delay=0 }) {
  return (
    <Card gold={gold} style={{ padding:'22px 24px', animation:`fadeUp .4s ${delay}s ease both` }}>
      <div style={{ fontSize:10, fontWeight:700, color: gold ? 'var(--gold)' : 'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:14 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:600, color: gold ? 'var(--gold-light)' : 'var(--text)', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>{sub}</div>}
    </Card>
  );
}

/* ── CopyBtn ───────────────────────────────────────────────────────────────── */
export function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(text).catch(()=>{}); setDone(true); setTimeout(()=>setDone(false),2000); };
  return (
    <Btn variant={done ? 'success' : 'ghost'} size="sm" onClick={copy}>
      {done
        ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
      }
    </Btn>
  );
}

/* ── GoldLine ──────────────────────────────────────────────────────────────── */
export function GoldLine() {
  return <div style={{ height:1, background:'linear-gradient(90deg,transparent,var(--gold-border),transparent)' }} />;
}

/* ── Empty ─────────────────────────────────────────────────────────────────── */
export function Empty({ icon='✦', title, sub, action }) {
  return (
    <div style={{ textAlign:'center', padding:'52px 24px', animation:'fadeUp .4s ease' }}>
      <div style={{ fontSize:36, marginBottom:16, color:'var(--gold)', opacity:.5 }}>{icon}</div>
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:500, marginBottom:8 }}>{title}</h3>
      {sub && <p style={{ fontSize:13, color:'var(--text2)', marginBottom: action ? 20 : 0, lineHeight:1.6 }}>{sub}</p>}
      {action}
    </div>
  );
}

/* ── Divider ───────────────────────────────────────────────────────────────── */
export function Divider({ my=18 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:`${my}px 0` }}>
      <div style={{ flex:1, height:1, background:'var(--border)' }} />
    </div>
  );
}