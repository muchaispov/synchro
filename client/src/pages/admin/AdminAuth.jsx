import { useState } from 'react';
import { authAPI }   from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Btn, Inp, SynchroLogo } from '../../components/UI';

export default function AdminAuth({ onLogin }) {
  const { toast }  = useToast();
  const [form, setForm]       = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      if (res.user.role !== 'admin') {
        return toast('Admin access required.', 'error');
      }
      localStorage.setItem('synchro_token', res.token);
      onLogin(res.token, res.user);
      toast('Welcome, Admin.', 'success');
    } catch(err) {
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(239,68,68,.04) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'-10%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.03) 0%,transparent 70%)' }} />
      </div>

      <div style={{ width:'100%', maxWidth:400, animation:'fadeUp .5s ease', position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:48 }}>
          <SynchroLogo size={34} />
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, letterSpacing:'.03em' }}>Synchro</div>
            <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase' }}>Admin Portal</div>
          </div>
        </div>

        <h2 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:500, marginBottom:8 }}>Admin Sign In</h2>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:32 }}>Restricted access. Authorised personnel only.</p>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Inp label="Email Address" type="email" placeholder="admin@synchro.co.ke" value={form.email} onChange={set('email')} required />
          <Inp label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
          <Btn type="submit" full loading={loading} size="lg" style={{ marginTop:4, background:'linear-gradient(135deg,#dc2626,#b91c1c)', border:'none', color:'#fff', fontWeight:700, boxShadow:'0 4px 20px rgba(220,38,38,.3)' }}>
            Sign In to Admin
          </Btn>
        </form>

        <div style={{ marginTop:28, display:'flex', alignItems:'center', gap:8, background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'10px 14px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink:0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5 }}>This area is monitored. Unauthorised access attempts are logged.</span>
        </div>
      </div>
    </div>
  );
}
