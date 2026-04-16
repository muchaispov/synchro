import { useState } from 'react';
import { useAuth }   from '../../context/AuthContext';
import { useToast }  from '../../components/Toast';
import { authAPI }   from '../../services/api';
import { Card, Btn, Inp, GoldLine, SynchroLogo } from '../../components/UI';

export default function SellerProfile() {
  const { user, login } = useAuth();
  const { toast }       = useToast();

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone:     user?.phone     || '',
    email:     user?.email     || '',
  });
  const [pwForm, setPwForm] = useState({ current_password:'', new_password:'', confirm_password:'' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw,      setSavingPw]      = useState(false);

  const setP  = k => e => setProfileForm(p => ({ ...p, [k]: e.target.value }));
  const setPW = k => e => setPwForm(p => ({ ...p, [k]: e.target.value }));

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // PATCH /api/auth/me  (we'll use the me endpoint for now)
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('synchro_token')}` },
        body: JSON.stringify({ full_name: profileForm.full_name, phone: profileForm.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      // Refresh user in context
      const me = await authAPI.me();
      login(localStorage.getItem('synchro_token'), me);
      toast('Profile updated.', 'success');
    } catch(err) {
      toast(err.message, 'error');
    } finally { setSavingProfile(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      return toast('New passwords do not match.', 'error');
    }
    if (pwForm.new_password.length < 8) {
      return toast('Password must be at least 8 characters.', 'error');
    }
    setSavingPw(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('synchro_token')}` },
        body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      toast('Password changed successfully.', 'success');
      setPwForm({ current_password:'', new_password:'', confirm_password:'' });
    } catch(err) {
      toast(err.message, 'error');
    } finally { setSavingPw(false); }
  }

  return (
    <div style={{ animation:'fadeIn .4s ease', maxWidth:680 }}>

      {/* Header */}
      <div style={{ marginBottom:36 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Profile & Settings</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Manage your account details and security.</p>
      </div>

      {/* Account overview card */}
      <Card gold style={{ padding:'24px 28px', marginBottom:24, display:'flex', alignItems:'center', gap:20, animation:'fadeUp .4s ease' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'linear-gradient(135deg,var(--gold),var(--gold-dim))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#080a0e', flexShrink:0 }}>
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, marginBottom:2 }}>{user?.full_name}</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>{user?.email}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:700, color:'var(--gold)', background:'var(--gold-subtle)', padding:'2px 8px', borderRadius:4, border:'1px solid var(--gold-border)', letterSpacing:'.08em', textTransform:'uppercase' }}>Seller</span>
            {user?.is_verified && <span style={{ fontSize:10, fontWeight:700, color:'#4ade80', background:'rgba(34,197,94,.1)', padding:'2px 8px', borderRadius:4, border:'1px solid rgba(34,197,94,.2)', letterSpacing:'.08em', textTransform:'uppercase' }}>Verified</span>}
            {user?.kyc_status === 'approved' && <span style={{ fontSize:10, fontWeight:700, color:'#60a5fa', background:'rgba(59,130,246,.1)', padding:'2px 8px', borderRadius:4, border:'1px solid rgba(59,130,246,.2)', letterSpacing:'.08em', textTransform:'uppercase' }}>KYC Approved</span>}
          </div>
        </div>
        {user?.reputation_score && (
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:600, color:'var(--gold-light)', lineHeight:1 }}>{user.reputation_score}</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:4, letterSpacing:'.08em', textTransform:'uppercase' }}>/ 5 Rating</div>
          </div>
        )}
      </Card>

      {/* Profile form */}
      <Card style={{ marginBottom:20, animation:'fadeUp .4s .08s ease both' }}>
        <div style={{ padding:'20px 24px' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600 }}>Personal Details</h2>
        </div>
        <GoldLine />
        <form onSubmit={saveProfile} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Inp label="Full Name" value={profileForm.full_name} onChange={setP('full_name')} required />
            <Inp label="Phone Number" value={profileForm.phone} onChange={setP('phone')} placeholder="+254 7XX XXX XXX" hint="Used for M-Pesa payouts" />
          </div>
          <Inp label="Email Address" value={profileForm.email} type="email" disabled hint="Email cannot be changed. Contact support if needed." />
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn type="submit" loading={savingProfile}>Save Changes</Btn>
          </div>
        </form>
      </Card>

      {/* Password form */}
      <Card style={{ animation:'fadeUp .4s .16s ease both' }}>
        <div style={{ padding:'20px 24px' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600 }}>Change Password</h2>
        </div>
        <GoldLine />
        <form onSubmit={changePassword} style={{ padding:'24px', display:'flex', flexDirection:'column', gap:16 }}>
          <Inp label="Current Password" type="password" placeholder="••••••••" value={pwForm.current_password} onChange={setPW('current_password')} required />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Inp label="New Password" type="password" placeholder="Min 8 characters" value={pwForm.new_password} onChange={setPW('new_password')} required />
            <Inp label="Confirm New Password" type="password" placeholder="Repeat new password" value={pwForm.confirm_password} onChange={setPW('confirm_password')} required />
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn type="submit" loading={savingPw} variant="secondary">Change Password</Btn>
          </div>
        </form>
      </Card>

      {/* Danger zone */}
      <Card style={{ marginTop:20, animation:'fadeUp .4s .24s ease both', border:'1px solid rgba(239,68,68,.15)' }}>
        <div style={{ padding:'20px 24px' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, color:'#f87171' }}>Danger Zone</h2>
        </div>
        <div style={{ height:1, background:'rgba(239,68,68,.15)' }} />
        <div style={{ padding:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Delete Account</div>
            <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>Permanently delete your account and all associated data. This cannot be undone.</div>
          </div>
          <Btn variant="danger" onClick={() => toast('To delete your account, please contact support@synchro.co.ke', 'info')}>
            Delete Account
          </Btn>
        </div>
      </Card>
    </div>
  );
}