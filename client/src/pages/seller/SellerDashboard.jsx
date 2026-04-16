import { useState, useEffect } from 'react';
import { sellerAPI, txAPI }   from '../../services/api';
import { useToast }            from '../../components/Toast';
import { useAuth }             from '../../context/AuthContext';
import { StatCard, Card, Badge, Skeleton, Empty, GoldLine } from '../../components/UI';

function fmt(n) { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function SellerDashboard({ onNavigate }) {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const [summary, setSummary] = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    Promise.all([sellerAPI.summary(), txAPI.list({ role:'seller' })])
      .then(([s, txs]) => { setSummary(s); setOrders(txs.slice(0, 8)); })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>

      <div style={{ marginBottom:36, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <p style={{ fontSize:11, color:'var(--gold)', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:6 }}>{greeting}</p>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:38, fontWeight:500 }}>
            {user?.full_name?.split(' ')[0]}
            <span style={{ color:'var(--text3)', fontWeight:300 }}>'s Dashboard</span>
          </h1>
        </div>
        <button onClick={loadData} disabled={loading} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--text3)', padding:'7px 14px', fontSize:12, display:'flex', alignItems:'center', gap:6, transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--gold-border)'; e.currentTarget.style.color='var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text3)'; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: loading ? 'spin .75s linear infinite' : 'none' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      {/* Main stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:16, marginBottom:20 }}>
        {loading ? Array(4).fill(0).map((_,i) => (
          <Card key={i} style={{ padding:24 }}><Skeleton h={10} w="60%" style={{ marginBottom:16 }} /><Skeleton h={32} w="70%" /></Card>
        )) : <>
          <StatCard label="Available Balance" value={fmt(summary?.available_balance)} sub="Ready to withdraw" gold delay={0} />
          <StatCard label="Total Earned"       value={fmt(summary?.total_earned)}      sub="All time"         delay={.05} />
          <StatCard label="Active Escrows"     value={summary?.active_escrow ?? 0}     sub="Funded"           delay={.1} />
          <StatCard label="Completed"          value={summary?.completed ?? 0}         sub="Transactions"     delay={.15} />
        </>}
      </div>

      {/* Secondary stats */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:36 }}>
          {[
            { label:'Awaiting Confirmation', val: summary?.awaiting_confirmation ?? 0, color:'var(--blue)'  },
            { label:'In Dispute',            val: summary?.disputed ?? 0,              color:'var(--red)'   },
            { label:'Reputation',            val: summary?.reputation_score ? `${summary.reputation_score}/5` : '—', color:'var(--gold)' },
            { label:'Pending Withdrawal',    val: summary?.pending_withdrawal ? fmt(summary.pending_withdrawal) : '—', color:'var(--amber)' },
          ].map((s,i) => (
            <Card key={i} style={{ padding:'16px 20px', animation:`fadeUp .4s ${.2+i*.05}s ease both` }}>
              <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>{s.label}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color:s.color }}>{s.val}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Recent orders */}
      <Card style={{ animation:'fadeUp .4s .25s ease both' }}>
        <div style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600 }}>Recent Orders</h2>
          <button onClick={() => onNavigate('orders')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--gold)', fontWeight:600 }}>View all →</button>
        </div>
        <GoldLine />
        {loading ? (
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
            {Array(4).fill(0).map((_,i) => <Skeleton key={i} h={44} style={{ borderRadius:10 }} />)}
          </div>
        ) : orders.length === 0 ? (
          <Empty icon="📦" title="No orders yet" sub="Share a payment link to start receiving orders." />
        ) : orders.map((tx, i) => (
          <div key={tx.id} style={{ padding:'14px 24px', display:'flex', alignItems:'center', gap:16, borderBottom: i < orders.length-1 ? '1px solid var(--border)' : 'none', transition:'background .15s', cursor:'default' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: tx.status==='COMPLETED'?'var(--green)':tx.status==='DISPUTED'?'var(--red)':tx.status==='FUNDED'?'var(--gold)':'var(--text3)', flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>{tx.title}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>from {tx.buyer?.full_name}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>KES {Number(tx.amount).toLocaleString()}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{timeAgo(tx.created_at)}</div>
            </div>
            <Badge status={tx.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}