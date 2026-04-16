import { useState, useEffect } from 'react';
import { adminTeamAPI } from '../../services/api';
import { useToast }     from '../../components/Toast';
import { Btn, Inp, SynchroLogo, Spinner } from '../../components/UI';

export default function AcceptInvite() {
  const { toast }  = useToast();
  const token      = new URLSearchParams(window.location.search).get('token');
  const [form, setForm]       = useState({ full_name:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  if (!token) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <SynchroLogo size={48} />
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:500, color:'#f87171' }}>Invalid invite link</h2>
      <p style={{ fontSize:13, color:'var(--text2)' }}>This link is missing a token. Please request a new invite.</p>
    </div>
  );

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) return toast('Passwords do not match.','error');
    if (form.password.length < 8) return toast('Password must be at least 8 characters.','error');
    setLoading(true);
    try {
      const res = await adminTeamAPI.acceptInvite({ token, full_name: form.full_name, password: form.password });
      localStorage.setItem('synchro_token', res.token);
      toast('Account created! Welcome to the Synchro admin team.','success');
      setDone(true);
      setTimeout(() => window.location.href = '/admin', 2000);
    } catch(err) { toast(err.message,'error'); }
    finally { setLoading(false); }
  }

  if (done) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(34,197,94,.1)', border:'2px solid rgba(34,197,94,.3)', display:'flex', alignItems:'center', justifyContent:'center', animation:'goldPulse 2s ease infinite' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:500 }}>Welcome aboard!</h2>
      <p style={{ fontSize:13, color:'var(--text2)' }}>Redirecting to admin dashboard…</p>
      <Spinner size={20} color="var(--gold)" />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420, animation:'fadeUp .5s ease' }}>

        <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:40 }}>
          <SynchroLogo size={34} />
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Synchro</div>
            <div style={{ fontSize:10, color:'#f87171', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase' }}>Admin Portal</div>
          </div>
        </div>

        <h2 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:500, marginBottom:8 }}>Accept Invitation</h2>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:32, lineHeight:1.6 }}>
          You've been invited to join the Synchro admin team. Set your name and password to get started.
        </p>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Inp label="Your Full Name" placeholder="Jane Wanjiku" value={form.full_name} onChange={set('full_name')} required />
          <Inp label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
          <Inp label="Confirm Password" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
          <Btn type="submit" full loading={loading} size="lg" style={{ marginTop:4, background:'linear-gradient(135deg,#dc2626,#b91c1c)', border:'none', color:'#fff', fontWeight:700, boxShadow:'0 4px 20px rgba(220,38,38,.3)' }}>
            Create Admin Account
          </Btn>
        </form>
      </div>
    </div>
  );
}