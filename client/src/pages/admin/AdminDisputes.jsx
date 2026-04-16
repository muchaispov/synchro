import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Card, Btn, Inp, Modal, Badge, Skeleton, Empty, GoldLine } from '../../components/UI';

function fmt(n)     { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

const TABS = ['DISPUTED','COMPLETED','REFUNDED'];

function HandledBy({ tx }) {
  if (!tx.handler) return null;
  const isRelease = tx.status === 'COMPLETED';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:10, padding:'7px 10px', background: isRelease ? 'rgba(34,197,94,.06)' : 'rgba(168,85,247,.06)', border:`1px solid ${isRelease ? 'rgba(34,197,94,.15)' : 'rgba(168,85,247,.15)'}`, borderRadius:7 }}>
      <div style={{ width:22, height:22, borderRadius:5, background: isRelease ? 'rgba(34,197,94,.2)' : 'rgba(168,85,247,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color: isRelease ? '#4ade80' : '#c084fc', flexShrink:0 }}>
        {tx.handler?.full_name?.[0]?.toUpperCase()}
      </div>
      <span style={{ fontSize:11, color:'var(--text3)' }}>
        {isRelease ? 'Released' : 'Refunded'} by{' '}
        <strong style={{ color: isRelease ? '#4ade80' : '#c084fc' }}>{tx.handler?.full_name}</strong>
        {tx.completed_at && <span style={{ color:'var(--text3)' }}> · {fmtDate(tx.completed_at)}</span>}
      </span>
      {tx.admin_note && (
        <span style={{ fontSize:10, color:'var(--text3)', marginLeft:4, fontStyle:'italic' }}>"{tx.admin_note}"</span>
      )}
    </div>
  );
}

function ResolveModal({ tx, onResolved, onClose }) {
  const { toast }  = useToast();
  const [action,   setAction]  = useState('release');
  const [note,     setNote]    = useState('');
  const [loading,  setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminAPI.resolveDispute(tx.id, { action, note });
      toast(`Dispute ${action === 'release' ? 'resolved — funds released to seller' : 'resolved — buyer refunded'}.`, 'success');
      onResolved(res);
    } catch(err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:'var(--surface2)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{tx.title}</div>
        <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>
          Buyer: <strong>{tx.buyer?.full_name}</strong> · Seller: <strong>{tx.seller?.full_name}</strong>
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:6, padding:'8px 10px', lineHeight:1.6 }}>
          <strong style={{ color:'#f87171' }}>Dispute reason:</strong> {tx.dispute_reason}
        </div>
      </div>

      <div>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>Resolution</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { val:'release', label:'Release to Seller', desc:'Seller delivered as agreed',  color:'var(--green)', bg:'rgba(34,197,94,.08)',  border:'rgba(34,197,94,.3)' },
            { val:'refund',  label:'Refund Buyer',       desc:'Buyer deserves money back',   color:'#f87171',      bg:'rgba(239,68,68,.08)',  border:'rgba(239,68,68,.3)' },
          ].map(opt => (
            <button type="button" key={opt.val} onClick={() => setAction(opt.val)}
              style={{ padding:'12px', borderRadius:8, border:`1px solid ${action===opt.val ? opt.border : 'var(--border)'}`, background: action===opt.val ? opt.bg : 'var(--surface2)', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
              <div style={{ fontSize:12, fontWeight:700, color: action===opt.val ? opt.color : 'var(--text)', marginBottom:3 }}>{opt.label}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: action==='release' ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.06)', border:`1px solid ${action==='release' ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius:8, padding:'10px 14px', fontSize:12, color: action==='release' ? '#4ade80' : '#f87171' }}>
        {action === 'release'
          ? `${fmt(tx.seller_receives)} will be released to ${tx.seller?.full_name}`
          : `${fmt(tx.amount)} will be refunded to ${tx.buyer?.full_name}`}
      </div>

      <Inp label="Admin Note (optional)" textarea rows={3} placeholder="Explain your decision…" value={note} onChange={e => setNote(e.target.value)} />

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" variant={action==='release' ? 'success' : 'danger'} loading={loading}>Confirm Resolution</Btn>
      </div>
    </form>
  );
}

export default function AdminDisputes() {
  const { toast }   = useToast();
  const [tab,       setTab]      = useState('DISPUTED');
  const [allTxs,    setAllTxs]   = useState({});
  const [loading,   setLoading]  = useState(true);
  const [selected,  setSelected] = useState(null);

  useEffect(() => {
    // Load all three statuses
    Promise.all(
      TABS.map(s => adminAPI.transactions({ status: s }))
    ).then(([disputed, completed, refunded]) => {
      setAllTxs({
        DISPUTED:  disputed,
        COMPLETED: completed.filter(t => t.dispute_reason), // only dispute-resolved ones
        REFUNDED:  refunded,
      });
    }).catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, []);

  const visible = allTxs[tab] || [];

  function handleResolved(updated) {
    // Move from DISPUTED to its new status tab
    setAllTxs(p => ({
      ...p,
      DISPUTED:              (p.DISPUTED || []).filter(t => t.id !== updated.id),
      [updated.status]:      [updated, ...(p[updated.status] || [])],
    }));
    setSelected(null);
  }

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Disputes</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Review, resolve, and audit all buyer-seller disputes.</p>
      </div>

      {/* Alert */}
      {(allTxs.DISPUTED?.length || 0) > 0 && (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:'var(--r)', padding:'12px 16px', marginBottom:20, fontSize:13, color:'#f87171', display:'flex', alignItems:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <strong>{allTxs.DISPUTED.length}</strong> open dispute{allTxs.DISPUTED.length !== 1 ? 's' : ''} requiring attention
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[
          { id:'DISPUTED',  label:'Open',     color:'#f87171' },
          { id:'COMPLETED', label:'Released', color:'#4ade80' },
          { id:'REFUNDED',  label:'Refunded', color:'#c084fc' },
        ].map(t => {
          const count = allTxs[t.id]?.length || 0;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${tab===t.id ? t.color+'44' : 'var(--border)'}`, background: tab===t.id ? t.color+'14' : 'transparent', color: tab===t.id ? t.color : 'var(--text3)', fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s', display:'flex', alignItems:'center', gap:6 }}>
              {t.label}
              {count > 0 && <span style={{ background: tab===t.id ? t.color : 'var(--surface3)', color: tab===t.id ? '#080a0e' : 'var(--text3)', borderRadius:10, padding:'1px 6px', fontSize:9 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {Array(3).fill(0).map((_,i) => <Skeleton key={i} h={130} style={{ borderRadius:12 }} />)}
        </div>
      ) : visible.length === 0 ? (
        <Empty icon="⚖️" title={`No ${tab.toLowerCase()} disputes`} sub={tab==='DISPUTED' ? 'All disputes have been resolved.' : 'No disputes with this status yet.'} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {visible.map(tx => (
            <Card key={tx.id} style={{ padding:'18px 22px', animation:'fadeUp .35s ease' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ fontSize:14, fontWeight:700 }}>{tx.title}</div>
                    <Badge status={tx.status} />
                  </div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:10 }}>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>🧑 Buyer: <strong style={{ color:'var(--text)' }}>{tx.buyer?.full_name}</strong></span>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>🏪 Seller: <strong style={{ color:'var(--text)' }}>{tx.seller?.full_name}</strong></span>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>💰 <strong style={{ color:'var(--gold-light)', fontFamily:'var(--font-display)' }}>{fmt(tx.amount)}</strong></span>
                    <span style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{tx.reference}</span>
                  </div>
                  <div style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                    <strong style={{ color:'#f87171' }}>Dispute reason:</strong> {tx.dispute_reason}
                  </div>
                  {/* ── Handled by ── */}
                  <HandledBy tx={tx} />
                </div>
                {tx.status === 'DISPUTED' && (
                  <Btn variant="danger" onClick={() => setSelected(tx)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Resolve
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Resolve Dispute" wide>
        {selected && <ResolveModal tx={selected} onResolved={handleResolved} onClose={() => setSelected(null)} />}
      </Modal>
    </div>
  );
}