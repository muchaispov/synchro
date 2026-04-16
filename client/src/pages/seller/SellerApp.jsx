import { useState, useEffect } from 'react';
import { useAuth }         from '../../context/AuthContext';
import { SynchroLogo, GoldLine } from '../../components/UI';
import { txAPI }           from '../../services/api';
import SellerDashboard     from './SellerDashboard';
import SellerLinks         from './SellerLinks';
import SellerOrders        from './SellerOrders';
import SellerPayouts       from './SellerPayouts';
import SellerProfile       from './SellerProfile';

const NAV = [
  { id:'dashboard', label:'Dashboard',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id:'links',     label:'Payment Links',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> },
  { id:'orders',    label:'Orders',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
  { id:'payouts',   label:'Payouts',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { id:'profile',   label:'Profile & Settings',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
];

function NavItem({ item, active, onClick, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={() => onClick(item.id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 14px', borderRadius:9, width:'100%', border: active ? '1px solid var(--gold-border)' : '1px solid transparent', background: active ? 'var(--gold-subtle)' : hov ? 'var(--surface2)' : 'transparent', color: active ? 'var(--gold-light)' : hov ? 'var(--text)' : 'var(--text2)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:13, fontWeight: active ? 700 : 500, transition:'all .15s', textAlign:'left' }}>
      <span style={{ opacity: active ? 1 : .7, position:'relative' }}>
        {item.icon}
        {badge > 0 && (
          <span style={{ position:'absolute', top:-5, right:-6, background:'var(--red)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{badge > 9 ? '9+' : badge}</span>
        )}
      </span>
      {item.label}
      {active && <span style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }} />}
    </button>
  );
}

function Sidebar({ page, onNavigate, user, onLogout, badges }) {
  return (
    <div style={{ width:230, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, flexShrink:0 }}>
      <div style={{ padding:'24px 20px 20px', display:'flex', alignItems:'center', gap:11 }}>
        <SynchroLogo size={30} />
        <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'.03em' }}>Synchro</span>
      </div>
      <GoldLine />
      <div style={{ padding:'16px 12px', flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        {NAV.map(item => (
          <NavItem key={item.id} item={item} active={page===item.id} onClick={onNavigate} badge={badges[item.id] || 0} />
        ))}
      </div>
      <GoldLine />
      <div style={{ padding:'16px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, padding:'10px 12px', background:'var(--surface)', borderRadius:10, border:'1px solid var(--border)' }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,var(--gold),var(--gold-dim))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#080a0e', flexShrink:0 }}>
            {user?.full_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name}</div>
            <div style={{ fontSize:10, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:'100%', padding:'8px 0', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer', fontSize:12, fontWeight:600, letterSpacing:'.04em', fontFamily:'var(--font-body)', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.08)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.borderColor='var(--border)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function SellerApp() {
  const { user, logout } = useAuth();
  const [page,      setPage]      = useState('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [badges,    setBadges]    = useState({ orders: 0 });

  // Poll for action-needed counts
  useEffect(() => {
    function refresh() {
      txAPI.list({ role:'seller' }).then(txs => {
        const actionNeeded = txs.filter(t => t.status === 'FUNDED' || t.status === 'DISPUTED').length;
        setBadges({ orders: actionNeeded });
      }).catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const PAGES = {
    dashboard: <SellerDashboard onNavigate={setPage} />,
    links:     <SellerLinks />,
    orders:    <SellerOrders />,
    payouts:   <SellerPayouts />,
    profile:   <SellerProfile />,
  };

  function navigate(p) { setPage(p); setMobileNav(false); }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      <div className="hide-mobile">
        <Sidebar page={page} onNavigate={navigate} user={user} onLogout={logout} badges={badges} />
      </div>

      <main style={{ flex:1, minWidth:0, overflow:'auto' }}>
        <div className="show-mobile" style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'none', alignItems:'center', justifyContent:'space-between', background:'var(--bg2)', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <SynchroLogo size={26} />
            <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600 }}>Synchro</span>
          </div>
          <button onClick={() => setMobileNav(p => !p)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text2)', padding:4, position:'relative' }}>
            {badges.orders > 0 && <span style={{ position:'absolute', top:0, right:0, width:8, height:8, borderRadius:'50%', background:'var(--red)' }} />}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>

        {mobileNav && (
          <div style={{ position:'fixed', inset:0, zIndex:500, animation:'fadeIn .2s ease' }}>
            <Sidebar page={page} onNavigate={navigate} user={user} onLogout={logout} badges={badges} />
          </div>
        )}

        <div style={{ padding:'36px 40px', maxWidth:1100, margin:'0 auto' }}>
          {PAGES[page]}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (max-width: 768px) {
          main > div:last-child { padding: 20px 16px !important; }
        }
      `}</style>
    </div>
  );
}

