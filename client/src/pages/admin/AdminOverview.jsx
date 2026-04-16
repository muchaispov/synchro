import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Card, Skeleton, GoldLine } from '../../components/UI';

function fmt(n)  { return `KES ${Number(n||0).toLocaleString('en-KE')}`; }
function fmtN(n) { return Number(n||0).toLocaleString(); }

function MiniChart({ data }) {
  if (!data || data.length === 0) return null;
  const max   = Math.max(...data.map(d => d.gmv), 1);
  const W     = 100, H = 40;
  const pts   = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.gmv / max) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10 }}>7-Day GMV</div>
      <svg viewBox={`0 0 ${W} ${H+8}`} style={{ width:'100%', height:60 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,168,76,.3)" />
            <stop offset="100%" stopColor="rgba(201,168,76,.0)" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#gmvGrad)" />
        <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * W;
          const y = H - (d.gmv / max) * H;
          return <circle key={i} cx={x} cy={y} r="2" fill="var(--gold)" />;
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        {data.filter((_, i) => i === 0 || i === data.length-1 || i === Math.floor(data.length/2)).map((d, i) => (
          <span key={i} style={{ fontSize:9, color:'var(--text3)' }}>{new Date(d.date).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { toast }  = useToast();
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    adminAPI.overview()
      .then(setData)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    { label:'Total GMV',         val: fmt(data.total_gmv),        gold: true },
    { label:'Platform Revenue',  val: fmt(data.platform_revenue), gold: false },
    { label:'Currently Escrowed',val: fmt(data.escrowed),         gold: false },
    { label:'Total Transactions',val: fmtN(data.total_transactions), gold: false },
    { label:'Open Disputes',     val: fmtN(data.open_disputes),   gold: false, alert: data.open_disputes > 0 },
    { label:'Pending Payouts',   val: fmtN(data.pending_payouts), gold: false, alert: data.pending_payouts > 0 },
    { label:'Total Sellers',     val: fmtN(data.total_sellers),   gold: false },
    { label:'Total Buyers',      val: fmtN(data.total_buyers),    gold: false },
  ] : [];

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Platform Overview</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Live metrics across all transactions and users.</p>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:14, marginBottom:24 }}>
        {loading ? Array(8).fill(0).map((_,i) => (
          <Card key={i} style={{ padding:22 }}><Skeleton h={10} w="60%" style={{ marginBottom:14 }} /><Skeleton h={28} w="70%" /></Card>
        )) : stats.map((s,i) => (
          <Card key={i} gold={s.gold} style={{ padding:'18px 22px', animation:`fadeUp .4s ${i*.04}s ease both`, border: s.alert ? '1px solid rgba(239,68,68,.3)' : undefined }}>
            <div style={{ fontSize:10, fontWeight:700, color: s.gold ? 'var(--gold)' : s.alert ? '#f87171' : 'var(--text3)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:600, color: s.gold ? 'var(--gold-light)' : s.alert ? '#f87171' : 'var(--text)' }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* GMV Chart */}
      {data?.daily_gmv && (
        <Card style={{ padding:'20px 24px', animation:'fadeUp .4s .3s ease both' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, marginBottom:4 }}>Revenue Trend</h2>
          <MiniChart data={data.daily_gmv} />
        </Card>
      )}
    </div>
  );
}
