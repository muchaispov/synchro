import { useState, useEffect } from 'react';
import { adminAPI, authAPI }  from '../../services/api';
import { SynchroLogo, GoldLine } from '../../components/UI';
import AdminAuth         from './AdminAuth';
import AdminOverview     from './AdminOverview';
import AdminTransactions from './AdminTransactions';
import AdminDisputes     from './AdminDisputes';
import AdminPayouts      from './AdminPayouts';
import AdminUsers        from './AdminUsers';
import AdminSettings     from './AdminSettings';
import AdminTeam         from './AdminTeam';
import AdminActivity     from './AdminActivity';

const NAV = [
  { id:'overview',     label:'Overview',       icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id:'transactions', label:'Transactions',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { id:'disputes',     label:'Disputes',       icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { id:'payouts',      label:'Payouts',        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  { id:'users',        label:'Users',          icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  { id:'settings',     label:'Settings',       icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, superOnly: true },
  { id:'team',         label:'Admin Team',     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, superOnly: true },
  { id:'activity',     label:'Activity Log',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, superOnly: true },
];

function NavItem({ item, active, onClick, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={() => onClick(item.id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 14px', borderRadius:9, width:'100%', border: active ? '1px solid rgba(239,68,68,.3)' : '1px solid transparent', background: active ? 'rgba(239,68,68,.08)' : hov ? 'var(--surface2)' : 'transparent', color: active ? '#f87171' : hov ? 'var(--text)' : 'var(--text2)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:13, fontWeight: active ? 700 : 500, transition:'all .15s', textAlign:'left' }}>
      <span style={{ opacity: active?1:.7, position:'relative' }}>
        {item.icon}
        {badge > 0 && <span style={{ position:'absolute', top:-5, right:-6, background:'var(--red)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{badge > 9 ? '9+' : badge}</span>}
      </span>
      {item.label}
      {active && <span style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:'#ef4444', flexShrink:0 }} />}
    </button>
  );
}

function Sidebar({ page, onNavigate, user, onLogout, badges }) {
  const isSuper = user?.admin_level === 'super_admin';
  const visibleNav = NAV.filter(n => !n.superOnly || isSuper);

  return (
    <div style={{ width:230, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, flexShrink:0 }}>
      <div style={{ padding:'24px 20px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:4 }}>
          <SynchroLogo size={30} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Synchro</span>
        </div>
        <div style={{ fontSize:10, color:'#f87171', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', paddingLeft:41 }}>Admin Portal</div>
      </div>
      <GoldLine />

      <div style={{ padding:'16px 12px', flex:1, display:'flex', flexDirection:'column', gap:4, overflowY:'auto' }}>
        {visibleNav.map(item => (
          <NavItem key={item.id} item={item} active={page===item.id} onClick={onNavigate} badge={badges[item.id] || 0} />
        ))}
      </div>

      <GoldLine />
      <div style={{ padding:'16px 14px' }}>
        {/* Level badge */}
        <div style={{ marginBottom:8, textAlign:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', padding:'2px 10px', borderRadius:20, background: isSuper ? 'rgba(220,38,38,.15)' : 'rgba(201,168,76,.1)', color: isSuper ? '#f87171' : 'var(--gold)' }}>
            {isSuper ? 'Super Admin' : 'Admin'}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, padding:'10px 12px', background:'var(--surface)', borderRadius:10, border:'1px solid rgba(239,68,68,.15)' }}>
          <div style={{ width:30, height:30, borderRadius:8, background: isSuper ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,var(--gold),var(--gold-dim))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color: isSuper?'#fff':'#080a0e', flexShrink:0 }}>
            {user?.full_name?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name}</div>
            <div style={{ fontSize:10, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width:'100%', padding:'8px 0', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--font-body)', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all .15s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.08)';e.currentTarget.style.color='#f87171';}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text3)';}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState('overview');
  const [badges,  setBadges]  = useState({ disputes:0, payouts:0 });

  useEffect(() => {
    const tok = localStorage.getItem('synchro_token');
    if (tok) {
      authAPI.me()
        .then(u => { if (u.role === 'admin') setUser(u); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    function refresh() {
      adminAPI.overview().then(data => {
        setBadges({ disputes: data.open_disputes || 0, payouts: data.pending_payouts || 0 });
      }).catch(() => {});
    }
    refresh();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, [user]);

  function handleLogin(tok, u) { setUser(u); }
  function logout() { localStorage.removeItem('synchro_token'); setUser(null); }

  const PAGES = {
    overview:     <AdminOverview />,
    transactions: <AdminTransactions />,
    disputes:     <AdminDisputes />,
    payouts:      <AdminPayouts />,
    users:        <AdminUsers />,
    settings:     <AdminSettings />,
    team:         <AdminTeam currentUser={user} />,
    activity:     <AdminActivity />,
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <SynchroLogo size={40} />
    </div>
  );

  if (!user) return <AdminAuth onLogin={handleLogin} />;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <div className="hide-mobile">
        <Sidebar page={page} onNavigate={setPage} user={user} onLogout={logout} badges={badges} />
      </div>
      <main style={{ flex:1, minWidth:0, overflow:'auto' }}>
        <div style={{ padding:'36px 40px', maxWidth:1200, margin:'0 auto' }}>
          {PAGES[page] || PAGES.overview}
        </div>
      </main>
      <style>{`@media(max-width:768px){.hide-mobile{display:none!important}}`}</style>
    </div>
  );
}