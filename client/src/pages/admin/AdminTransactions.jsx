import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Card, Badge, Skeleton, Empty } from '../../components/UI';

function fmt(n)     { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }

const FILTERS = ['ALL','PENDING','FUNDED','DELIVERED','COMPLETED','DISPUTED','REFUNDED','CANCELLED'];

export default function AdminTransactions() {
  const { toast }  = useToast();
  const [txs,      setTxs]     = useState([]);
  const [loading,  setLoading] = useState(true);
  const [filter,   setFilter]  = useState('ALL');

  useEffect(() => {
    const p = filter !== 'ALL' ? { status: filter } : {};
    adminAPI.transactions(p)
      .then(setTxs)
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>All Transactions</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Full platform transaction history.</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
            style={{ padding:'6px 13px', borderRadius:20, border:`1px solid ${filter===f?'var(--gold-border)':'var(--border)'}`, background: filter===f?'var(--gold-subtle)':'transparent', color: filter===f?'var(--gold-light)':'var(--text3)', fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
            {f}
          </button>
        ))}
      </div>

      <Card>
        {/* Table header */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr 120px 100px 120px', gap:12, fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase' }}>
          <span>Transaction</span><span>Parties</span><span>Amount</span><span>Status</span><span>Date</span>
        </div>

        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {Array(8).fill(0).map((_,i) => <Skeleton key={i} h={52} style={{ borderRadius:8 }} />)}
          </div>
        ) : txs.length === 0 ? (
          <Empty icon="📋" title="No transactions" sub={filter !== 'ALL' ? `No ${filter.toLowerCase()} transactions.` : 'No transactions yet.'} />
        ) : txs.map(tx => (
          <div key={tx.id} style={{ padding:'12px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 120px 100px 120px', gap:12, alignItems:'center', borderBottom:'1px solid var(--border)', transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.title}</div>
              <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>{tx.reference}</div>
            </div>
            <div>
              <div style={{ fontSize:11, marginBottom:2 }}>🧑 {tx.buyer?.full_name}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>🏪 {tx.seller?.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-display)' }}>{fmt(tx.amount)}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>fee {fmt(tx.platform_fee)}</div>
            </div>
            <Badge status={tx.status} />
            <div style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(tx.created_at)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
