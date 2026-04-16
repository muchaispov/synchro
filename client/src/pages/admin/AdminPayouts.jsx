import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Card, Btn, Inp, Modal, Skeleton, Empty, GoldLine } from '../../components/UI';

function fmt(n)     { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }

const STATUS_COLOR = {
  pending:  { bg:'rgba(245,158,11,.1)',  color:'#fbbf24' },
  approved: { bg:'rgba(34,197,94,.1)',   color:'#4ade80' },
  rejected: { bg:'rgba(239,68,68,.1)',   color:'#f87171' },
  paid:     { bg:'rgba(201,168,76,.1)',  color:'#e8c86a' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.pending;
  return <span style={{ background:s.bg, color:s.color, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>{status}</span>;
}

function ActionModal({ wr, action, onDone, onClose }) {
  const { toast }  = useToast();
  const [note,     setNote]    = useState('');
  const [loading,  setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = action === 'approve'
        ? await adminAPI.approvePayout(wr.id, { note })
        : await adminAPI.rejectPayout(wr.id, { note });
      toast(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}.`, action === 'approve' ? 'success' : 'info');
      onDone(res);
    } catch(err) { toast(err.message,'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:'var(--surface2)', borderRadius:8, padding:'14px 16px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{wr.seller?.full_name}</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color: action==='approve' ? 'var(--gold-light)' : '#f87171', marginBottom:4 }}>{fmt(wr.amount)}</div>
        <div style={{ fontSize:11, color:'var(--text3)' }}>
          To: {wr.bank_account?.mpesa_phone || wr.bank_account?.bank_name} · {fmtDate(wr.created_at)}
        </div>
      </div>
      <Inp label="Note (optional)" textarea rows={2} placeholder={action === 'approve' ? 'Approved — payment initiated' : 'Reason for rejection…'} value={note} onChange={e => setNote(e.target.value)} />
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" variant={action === 'approve' ? 'success' : 'danger'} loading={loading}>
          {action === 'approve' ? 'Approve & Pay' : 'Reject'}
        </Btn>
      </div>
    </form>
  );
}

export default function AdminPayouts() {
  const { toast }   = useToast();
  const [payouts,   setPayouts]  = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [filter,    setFilter]   = useState('pending');
  const [modal,     setModal]    = useState(null); // { wr, action }

  useEffect(() => {
    setLoading(true);
    adminAPI.payouts({ status: filter })
      .then(setPayouts)
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, [filter]);

  function handleDone(updated) {
    setPayouts(p => p.filter(w => w.id !== updated.id));
    setModal(null);
  }

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Payouts</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Manage seller withdrawal requests.</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['pending','approved','rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${filter===f?'var(--gold-border)':'var(--border)'}`, background: filter===f?'var(--gold-subtle)':'transparent', color: filter===f?'var(--gold-light)':'var(--text3)', fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
            {f}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 120px 1fr 100px 120px', gap:12, fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase' }}>
          <span>Seller</span><span>Amount</span><span>Payout To</span><span>Status</span><span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {Array(5).fill(0).map((_,i) => <Skeleton key={i} h={52} style={{ borderRadius:8 }} />)}
          </div>
        ) : payouts.length === 0 ? (
          <Empty icon="💸" title={`No ${filter} payouts`} sub="Nothing to action here." />
        ) : payouts.map(wr => (
          <div key={wr.id} style={{ padding:'12px 20px', display:'grid', gridTemplateColumns:'1fr 120px 1fr 100px 120px', gap:12, alignItems:'center', borderBottom:'1px solid var(--border)', transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{wr.seller?.full_name}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{fmtDate(wr.created_at)}</div>
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--gold-light)' }}>{fmt(wr.amount)}</div>
            <div style={{ fontSize:11, color:'var(--text2)' }}>
              {wr.bank_account?.mpesa_phone
                ? <><span>📱 </span>{wr.bank_account.mpesa_phone}</>
                : <><span>🏦 </span>{wr.bank_account?.bank_name}</>}
              {/* Handled by */}
              {wr.handled_by && (
                <div style={{ marginTop:4, fontSize:10, color:'var(--text3)', display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:16, height:16, borderRadius:4, background:'rgba(201,168,76,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'var(--gold)', flexShrink:0 }}>
                    {wr.handled_by?.full_name?.[0]?.toUpperCase()}
                  </div>
                  {wr.status === 'approved' ? 'Approved' : 'Rejected'} by <strong style={{ color:'var(--text2)' }}>{wr.handled_by?.full_name}</strong>
                </div>
              )}
              {wr.admin_note && (
                <div style={{ marginTop:3, fontSize:10, color:'var(--text3)', fontStyle:'italic' }}>"{wr.admin_note}"</div>
              )}
            </div>
            <StatusBadge status={wr.status} />
            <div style={{ display:'flex', gap:6 }}>
              {wr.status === 'pending' && <>
                <Btn size="sm" variant="success" onClick={() => setModal({ wr, action:'approve' })}>Approve</Btn>
                <Btn size="sm" variant="danger"  onClick={() => setModal({ wr, action:'reject'  })}>Reject</Btn>
              </>}
              {wr.status !== 'pending' && <span style={{ fontSize:11, color:'var(--text3)' }}>—</span>}
            </div>
          </div>
        ))}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}>
        {modal && <ActionModal wr={modal.wr} action={modal.action} onDone={handleDone} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}