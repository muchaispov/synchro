import { createContext, useContext, useState, useCallback, useRef } from 'react';

const Ctx = createContext(null);

const STYLE = {
  success: { bg:'#0a1f12', border:'rgba(34,197,94,.3)',  icon:'#22c55e', text:'#bbf7d0' },
  error:   { bg:'#1f0a0a', border:'rgba(239,68,68,.3)',  icon:'#ef4444', text:'#fecaca' },
  info:    { bg:'#0d1420', border:'rgba(201,168,76,.3)', icon:'#c9a84c', text:'#fef3c7' },
  warning: { bg:'#1f180a', border:'rgba(245,158,11,.3)', icon:'#f59e0b', text:'#fde68a' },
};

const ICONS = {
  success: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  error:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  info:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  warning: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

function Toast({ msg, type, out, onDismiss }) {
  const s = STYLE[type] || STYLE.info;
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'13px 16px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, backdropFilter:'blur(16px)', boxShadow:'0 16px 48px rgba(0,0,0,.6)', minWidth:300, maxWidth:380, animation: out ? 'toastOut .3s ease forwards' : 'toastIn .35s cubic-bezier(.34,1.4,.64,1) forwards' }}>
      <span style={{ color:s.icon, flexShrink:0, marginTop:1 }}>{ICONS[type]}</span>
      <span style={{ color:s.text, fontSize:13, flex:1, lineHeight:1.5 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:2, flexShrink:0 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const ctr = useRef(0);

  const dismiss = useCallback(id => {
    setToasts(p => p.map(t => t.id === id ? { ...t, out: true } : t));
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 340);
  }, []);

  const toast = useCallback((msg, type = 'info', dur = 4000) => {
    const id = ++ctr.current;
    setToasts(p => [...p, { id, msg, type, out: false }]);
    if (dur > 0) setTimeout(() => dismiss(id), dur);
    return id;
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);