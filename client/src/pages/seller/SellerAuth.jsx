import { useState } from 'react';
import { useAuth }   from '../../context/AuthContext';
import { authAPI }   from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Btn, Inp, SynchroLogo } from '../../components/UI';

export default function SellerAuth() {
  const { login }  = useAuth();
  const { toast }  = useToast();
  const [mode, setMode]       = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name:'', email:'', password:'', phone:'' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await authAPI.login({ email: form.email, password: form.password })
        : await authAPI.registerSeller(form);
      login(res.token, res.user);
      toast(mode === 'login' ? 'Welcome back.' : 'Account created. Welcome to Synchro.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', position:'relative', overflow:'hidden' }}>

      {/* Background glow */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-20%', right:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.04) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.03) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(201,168,76,.06),transparent)', animation:'lineScan 8s ease infinite' }} />
      </div>

      <div style={{ width:'100%', maxWidth:420, animation:'fadeUp .5s ease', position:'relative' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:48 }}>
          <SynchroLogo size={34} />
          <span style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, letterSpacing:'.03em' }}>Synchro</span>
        </div>

        {/* Heading */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, letterSpacing:'.01em', lineHeight:1.2, marginBottom:8 }}>
            {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
          </h2>
          <p style={{ fontSize:13, color:'var(--text2)' }}>
            {mode === 'login' ? 'Sign in to your seller dashboard.' : 'Start protecting your transactions today.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', background:'var(--surface)', borderRadius:'var(--r)', padding:4, marginBottom:28, border:'1px solid var(--border)' }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'9px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', fontFamily:'var(--font-body)', transition:'all .2s', background: mode===m ? 'var(--surface3)' : 'transparent', color: mode===m ? 'var(--gold)' : 'var(--text3)', boxShadow: mode===m ? 'inset 0 0 0 1px var(--gold-border)' : 'none' }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {mode === 'register' && (
            <Inp label="Full Name" placeholder="Jane Wanjiku" value={form.full_name} onChange={set('full_name')} required />
          )}
          <Inp label="Email Address" type="email" placeholder="jane@example.com" value={form.email} onChange={set('email')} required />
          {mode === 'register' && (
            <Inp label="Phone Number" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={set('phone')} hint="Used for M-Pesa payouts" />
          )}
          <Inp label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
          <Btn type="submit" full loading={loading} size="lg" style={{ marginTop:4 }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Btn>
        </form>

        <p style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:24 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
          <button onClick={() => setMode(mode==='login'?'register':'login')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gold)', fontSize:12, fontWeight:600 }}>
            {mode === 'login' ? 'Register here' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}