import { useState } from 'react';
import { SynchroLogo } from '../components/UI';

const GATE_KEY  = 'synchro_access';
const GATE_CODE = import.meta.env.VITE_ACCESS_CODE || 'SYNCHRO2025';

export function isAccessGranted() {
  return localStorage.getItem(GATE_KEY) === 'granted';
}

export default function AccessGate({ children }) {
  const [granted,  setGranted]  = useState(isAccessGranted);
  const [code,     setCode]     = useState('');
  const [error,    setError]    = useState('');
  const [shaking,  setShaking]  = useState(false);

  if (granted) return children;

  function attempt(e) {
    e.preventDefault();
    if (code.trim().toUpperCase() === GATE_CODE.toUpperCase()) {
      localStorage.setItem(GATE_KEY, 'granted');
      setGranted(true);
    } else {
      setError('Incorrect access code.');
      setShaking(true);
      setTimeout(() => { setShaking(false); setError(''); setCode(''); }, 1200);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>

      {/* Background */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,176,.06) 0%,transparent 70%)' }} />
        <div style={{ position:'absolute', bottom:'10%', right:'10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.05) 0%,transparent 70%)' }} />
      </div>

      <div style={{ width:'100%', maxWidth:400, animation: shaking ? 'none' : 'fadeUp .4s ease', transform: shaking ? 'translateX(0)' : 'none', position:'relative' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <img src="/synchro-logo.jpeg" alt="Synchro" style={{ width:80, height:80, borderRadius:16, objectFit:'contain', background:'white', padding:8 }} />
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, marginTop:12, color:'var(--text)' }}>Synchro</div>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', marginTop:4 }}>Early Access</div>
        </div>

        {/* Card */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--rxl)', padding:'36px 32px', boxShadow:'var(--shadow-lg)' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:600, marginBottom:8, textAlign:'center' }}>
            Access Required
          </h2>
          <p style={{ fontSize:13, color:'var(--text2)', textAlign:'center', lineHeight:1.6, marginBottom:28 }}>
            Synchro is currently in private beta. Enter your access code to continue.
          </p>

          <form onSubmit={attempt} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter access code"
              autoFocus
              style={{ width:'100%', textAlign:'center', fontSize:18, fontWeight:700, letterSpacing:8, padding:'14px 16px', background:'var(--surface2)', border:`1px solid ${error ? 'rgba(239,68,68,.5)' : 'var(--border)'}`, borderRadius:'var(--r)', color:'var(--text)', outline:'none', fontFamily:'var(--font-body)', transition:'border-color .2s',
                animation: shaking ? 'shake .4s ease' : 'none' }}
            />
            {error && <p style={{ fontSize:12, color:'#f87171', textAlign:'center', margin:0 }}>{error}</p>}
            <button type="submit" style={{ background:'linear-gradient(135deg,var(--brand-blue),var(--brand-blue-light))', color:'#fff', fontWeight:700, fontSize:14, padding:'13px', borderRadius:'var(--r)', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(37,99,176,.3)', transition:'all .2s', letterSpacing:'.02em' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform='none'}>
              Enter
            </button>
          </form>
        </div>

        {/* Back to landing */}
        <div style={{ textAlign:'center', marginTop:20 }}>
          <a href="/" style={{ fontSize:12, color:'var(--text3)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to synchro.co.ke
          </a>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}