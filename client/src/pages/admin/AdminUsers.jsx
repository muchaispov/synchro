import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Card, Btn, Skeleton, Empty } from '../../components/UI';

function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }

const ROLE_COLOR = {
  buyer:  { bg:'rgba(59,130,246,.1)',  color:'#60a5fa' },
  seller: { bg:'rgba(201,168,76,.1)',  color:'#e8c86a' },
  admin:  { bg:'rgba(239,68,68,.1)',   color:'#f87171' },
};

function RoleBadge({ role }) {
  const s = ROLE_COLOR[role] || ROLE_COLOR.buyer;
  return <span style={{ background:s.bg, color:s.color, padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>{role}</span>;
}

export default function AdminUsers() {
  const { toast }  = useToast();
  const [users,    setUsers]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [filter,   setFilter]  = useState('ALL');
  const [search,   setSearch]  = useState('');

  useEffect(() => {
    const p = filter !== 'ALL' ? { role: filter.toLowerCase() } : {};
    adminAPI.users(p)
      .then(setUsers)
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, [filter]);

  async function toggleBan(user) {
    try {
      const res = await adminAPI.banUser(user.id);
      setUsers(p => p.map(u => u.id === user.id ? res.user : u));
      toast(`User ${res.user.is_active ? 'unbanned' : 'banned'}.`, 'success');
    } catch(e) { toast(e.message,'error'); }
  }

  async function approveKyc(user) {
    try {
      const res = await adminAPI.verifyKyc(user.id, { status:'approved' });
      setUsers(p => p.map(u => u.id === user.id ? res : u));
      toast('KYC approved.', 'success');
    } catch(e) { toast(e.message,'error'); }
  }

  const visible = users.filter(u =>
    search === '' ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Users</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Manage platform users, KYC and access.</p>
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:6 }}>
          {['ALL','SELLER','BUYER','ADMIN'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
              style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${filter===f?'var(--gold-border)':'var(--border)'}`, background: filter===f?'var(--gold-subtle)':'transparent', color: filter===f?'var(--gold-light)':'var(--text3)', fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
              {f}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          style={{ flex:1, minWidth:200, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 13px', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font-body)' }} />
      </div>

      <Card>
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 80px 100px 80px 160px', gap:12, fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase' }}>
          <span>User</span><span>Role</span><span>Joined</span><span>Status</span><span>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {Array(8).fill(0).map((_,i) => <Skeleton key={i} h={52} style={{ borderRadius:8 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <Empty icon="👥" title="No users found" sub={search ? 'Try a different search term.' : 'No users yet.'} />
        ) : visible.map(u => (
          <div key={u.id} style={{ padding:'12px 20px', display:'grid', gridTemplateColumns:'1fr 80px 100px 80px 160px', gap:12, alignItems:'center', borderBottom:'1px solid var(--border)', transition:'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:2, display:'flex', alignItems:'center', gap:6 }}>
                {u.full_name}
                {u.is_verified && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{u.email || u.phone}</div>
            </div>
            <RoleBadge role={u.role} />
            <div style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(u.created_at)}</div>
            <div>
              {u.is_active
                ? <span style={{ fontSize:10, color:'var(--green)', fontWeight:700 }}>Active</span>
                : <span style={{ fontSize:10, color:'#f87171', fontWeight:700 }}>Banned</span>}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {u.role !== 'admin' && (
                <Btn size="sm" variant={u.is_active ? 'danger' : 'success'} onClick={() => toggleBan(u)}>
                  {u.is_active ? 'Ban' : 'Unban'}
                </Btn>
              )}
              {u.role === 'seller' && u.kyc_status !== 'approved' && (
                <Btn size="sm" variant="gold" onClick={() => approveKyc(u)}>KYC</Btn>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
