import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Card, Btn, Inp, Modal, Skeleton, Empty, GoldLine } from '../../components/UI';

function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }

const LEVEL_STYLE = {
  super_admin: { bg:'rgba(239,68,68,.1)', color:'#f87171', label:'Super Admin' },
  admin:       { bg:'rgba(201,168,76,.1)',color:'#e8c86a', label:'Admin' },
};
function LevelBadge({ level }) {
  const s = LEVEL_STYLE[level] || LEVEL_STYLE.admin;
  return <span style={{ background:s.bg, color:s.color, padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>{s.label}</span>;
}

function InviteModal({ onInvited, onClose }) {
  const { toast }  = useToast();
  const [form, setForm]       = useState({ email:'', admin_level:'admin' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await adminAPI.inviteAdmin(form);
      toast(`Invite sent to ${form.email}.`, 'success');
      onInvited(res.invite);
    } catch(err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Inp label="Email Address" type="email" placeholder="newadmin@synchro.co.ke" value={form.email} onChange={set('email')} required />
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:8 }}>Access Level</label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { val:'admin',       label:'Admin',       desc:'Disputes, payouts, users, settings' },
            { val:'super_admin', label:'Super Admin', desc:'Full access + team management' },
          ].map(opt => (
            <button type="button" key={opt.val} onClick={() => setForm(p => ({ ...p, admin_level: opt.val }))}
              style={{ padding:'12px', borderRadius:8, border:`1px solid ${form.admin_level===opt.val?(opt.val==='super_admin'?'rgba(239,68,68,.4)':'var(--gold-border)'):'var(--border)'}`, background: form.admin_level===opt.val?(opt.val==='super_admin'?'rgba(239,68,68,.08)':'var(--gold-subtle)'):'var(--surface2)', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
              <div style={{ fontSize:12, fontWeight:700, color: form.admin_level===opt.val?(opt.val==='super_admin'?'#f87171':'var(--gold-light)'):'var(--text)', marginBottom:3 }}>{opt.label}</div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ background:'var(--surface2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>
        An invite link will be sent to their email. They'll set their own password when they accept. Expires in <strong style={{ color:'var(--text)' }}>3 days</strong>.
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" loading={loading}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send Invite
        </Btn>
      </div>
    </form>
  );
}

export default function AdminTeam({ currentUser }) {
  const { toast }    = useToast();
  const [admins,     setAdmins]     = useState([]);
  const [invites,    setInvites]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const isSuperAdmin = currentUser?.admin_level === 'super_admin';

  useEffect(() => {
    Promise.all([adminAPI.listTeam(), adminAPI.listInvites()])
      .then(([team, inv]) => { setAdmins(team); setInvites(inv); })
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, []);

  async function removeAdmin(u) {
    if (!window.confirm(`Remove ${u.full_name} from the admin team?`)) return;
    try {
      await adminAPI.removeAdmin(u.id);
      setAdmins(p => p.filter(a => a.id !== u.id));
      toast(`${u.full_name} removed.`, 'success');
    } catch(e) { toast(e.message,'error'); }
  }

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Admin Team</h1>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Manage admin access and invite new team members.</p>
        </div>
        {isSuperAdmin && (
          <Btn onClick={() => setShowInvite(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Invite Admin
          </Btn>
        )}
      </div>

      <Card style={{ marginBottom:24 }}>
        <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Team Members</h2>
          <span style={{ fontSize:12, color:'var(--text3)' }}>{admins.length} admin{admins.length!==1?'s':''}</span>
        </div>
        <GoldLine />
        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {Array(3).fill(0).map((_,i) => <Skeleton key={i} h={60} style={{ borderRadius:8 }} />)}
          </div>
        ) : admins.map(u => (
          <div key={u.id} style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid var(--border)', transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{ width:38, height:38, borderRadius:9, background: u.admin_level==='super_admin'?'linear-gradient(135deg,#dc2626,#b91c1c)':'linear-gradient(135deg,var(--gold),var(--gold-dim))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color: u.admin_level==='super_admin'?'#fff':'#080a0e', flexShrink:0 }}>
              {u.full_name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:3, display:'flex', alignItems:'center', gap:8 }}>
                {u.full_name}
                {u.id===currentUser?.id && <span style={{ fontSize:9, color:'var(--text3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>(You)</span>}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{u.email} · Joined {fmtDate(u.created_at)}</div>
            </div>
            <LevelBadge level={u.admin_level} />
            {isSuperAdmin && u.id!==currentUser?.id && (
              <Btn size="sm" variant="danger" onClick={() => removeAdmin(u)}>Remove</Btn>
            )}
          </div>
        ))}
      </Card>

      {/* Pending invites */}
      {isSuperAdmin && invites.filter(i=>!i.used).length > 0 && (
        <Card>
          <div style={{ padding:'16px 20px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Pending Invites</h2>
          </div>
          <GoldLine />
          {invites.filter(i=>!i.used).map(inv => (
            <div key={inv.id} style={{ padding:'12px 20px', display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{inv.email}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>Invited by {inv.invited_by?.full_name} · expires {fmtDate(inv.expires_at)}</div>
              </div>
              <LevelBadge level={inv.admin_level} />
              <span style={{ fontSize:10, fontWeight:700, color:'#fbbf24', background:'rgba(245,158,11,.1)', padding:'2px 8px', borderRadius:4, letterSpacing:'.06em', textTransform:'uppercase' }}>Pending</span>
            </div>
          ))}
        </Card>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Admin">
        <InviteModal onInvited={inv => { setInvites(p=>[inv,...p]); setShowInvite(false); }} onClose={() => setShowInvite(false)} />
      </Modal>
    </div>
  );
}