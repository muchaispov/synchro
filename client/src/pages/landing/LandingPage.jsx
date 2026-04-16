import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

/* ─── Smart Logo ──────────────────────────────────────────────────────── */
function Logo({ size = 32, style = {} }) {
  const { theme } = useTheme();
  return (
    <img
      src={theme === 'dark' ? '/synchro-logo-dark.jpeg' : '/synchro-logo.jpeg'}
      alt="Synchro"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.18), objectFit: 'cover', display: 'block', ...style }}
    />
  );
}

/* ─── Theme Toggle ────────────────────────────────────────────────────── */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button onClick={toggle} aria-label="Toggle theme"
      style={{ width: 46, height: 26, borderRadius: 13, border: `1px solid ${dark ? '#222d3f' : '#c4cee5'}`, background: dark ? '#10141b' : '#e4edff', cursor: 'pointer', position: 'relative', flexShrink: 0, outline: 'none', transition: 'background .3s' }}>
      <span style={{ position: 'absolute', top: 3, left: dark ? 3 : 21, width: 18, height: 18, borderRadius: '50%', background: dark ? '#c9a84c' : '#1a4fa3', transition: 'left .25s cubic-bezier(.34,1.4,.64,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, boxShadow: '0 1px 4px rgba(0,0,0,.3)' }}>
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

/* ─── Navbar ──────────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [['#how','How It Works'],['#who',"Who It's For"],['#pricing','Pricing'],['#waitlist','Join Waitlist']];

  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, transition: 'all .3s', background: scrolled ? 'var(--bg)ee' : 'transparent', backdropFilter: scrolled ? 'blur(24px)' : 'none', borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent', WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', gap: 24 }}>

        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <Logo size={32} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--text)', letterSpacing: '.01em' }}>Synchro</span>
        </a>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1, justifyContent: 'center' }} className="lp-desk">
          {links.map(([h,l]) => (
            <a key={h} href={h} style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e=>e.target.style.color='var(--text)'} onMouseLeave={e=>e.target.style.color='var(--text2)'}>{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <ThemeToggle />
          <a href="#waitlist" className="lp-desk" style={{ fontSize: 12, fontWeight: 700, padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,var(--brand-blue),var(--brand-blue-light))', color: '#fff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(37,99,176,.3)', transition: 'all .2s', whiteSpace: 'nowrap' }}>
            Join Waitlist
          </a>
          <button onClick={()=>setOpen(p=>!p)} className="lp-mob" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 6, display: 'none' }}>
            {open
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 20px 20px' }}>
          {links.map(([h,l]) => (
            <a key={h} href={h} onClick={()=>setOpen(false)} style={{ display: 'block', padding: '13px 8px', fontSize: 15, color: 'var(--text2)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>{l}</a>
          ))}
          <a href="#waitlist" onClick={()=>setOpen(false)} style={{ display: 'block', marginTop: 14, padding: '13px', textAlign: 'center', background: 'linear-gradient(135deg,var(--brand-blue),var(--brand-blue-light))', color: '#fff', fontWeight: 700, fontSize: 15, borderRadius: 10, textDecoration: 'none' }}>Join the Waitlist</a>
        </div>
      )}

      <style>{`
        @media(max-width:768px){.lp-desk{display:none!important}.lp-mob{display:flex!important}}
        @media(min-width:769px){.lp-mob{display:none!important}}
      `}</style>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: 80, paddingBottom: 60 }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: 'min(80vw,800px)', height: 'min(80vw,800px)', borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,176,.09) 0%,transparent 62%)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: 'min(40vw,400px)', height: 'min(40vw,400px)', borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,76,.07) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)', backgroundSize: '64px 64px', opacity: .18 }} />
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        {/* Logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, animation: 'fadeUp .5s ease' }}>
          <Logo size={96} style={{ boxShadow: '0 16px 56px rgba(37,99,176,.22)', borderRadius: 22 }} />
        </div>

        {/* Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand-blue-subtle)', border: '1px solid var(--brand-blue-border)', borderRadius: 24, padding: '6px 16px', marginBottom: 26, animation: 'fadeUp .5s .06s ease both' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-blue)', display: 'inline-block', animation: 'pulse 2s ease infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-blue-light)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Kenya's Premier Escrow Platform</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px,9.5vw,96px)', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-.025em', marginBottom: 22, animation: 'fadeUp .5s .12s ease both' }}>
          Every deal,{' '}
          <span style={{ background: 'linear-gradient(125deg,var(--gold-light) 0%,var(--gold) 38%,var(--brand-blue-light) 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'gradMove 5s ease infinite' }}>
            protected.
          </span>
        </h1>

        {/* Sub */}
        <p style={{ fontSize: 'clamp(15px,2.2vw,19px)', color: 'var(--text2)', lineHeight: 1.8, maxWidth: 600, margin: '0 auto 40px', animation: 'fadeUp .5s .18s ease both' }}>
          Synchro holds your payment in escrow until the job is done — protecting buyers and ensuring sellers always get paid. For every deal, every size, across Kenya.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28, animation: 'fadeUp .5s .24s ease both' }}>
          <a href="#waitlist"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,var(--brand-blue),var(--brand-blue-light))', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 8px 28px rgba(37,99,176,.4)', transition: 'all .25s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 14px 36px rgba(37,99,176,.45)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 28px rgba(37,99,176,.4)';}}>
            Join the Waitlist
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
          <a href="#how"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, fontSize: 15, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', border: '1px solid var(--border2)', transition: 'all .2s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold-border)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
            See how it works
          </a>
        </div>

        {/* Trust strip */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp .5s .30s ease both' }}>
          {['🔒 Funds held securely','📱 M-Pesa & Card','⚡ Instant payouts','🇰🇪 Built for Kenya'].map((t,i)=>(
            <span key={i} style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n:'01', icon:'🔗', color:'var(--brand-blue)', title:'Create a payment link',  body:"Set your price, describe what you're delivering, generate a secure link in under 60 seconds. Share it anywhere — WhatsApp, email, Instagram." },
    { n:'02', icon:'🔒', color:'var(--gold)',        title:'Buyer pays into escrow', body:"Buyer pays via M-Pesa or card. Funds are held securely — neither party can access them until delivery is confirmed." },
    { n:'03', icon:'📦', color:'#a855f7',             title:'Seller delivers',        body:"Complete the work, upload proof of delivery. The buyer gets notified instantly to review what was delivered." },
    { n:'04', icon:'✅', color:'var(--green)',        title:'Funds released',         body:"Buyer confirms receipt. Money hits the seller's M-Pesa or bank immediately. Both parties walk away happy." },
  ];

  return (
    <section id="how" style={{ padding:'clamp(80px,10vw,140px) 20px', background:'var(--bg2)' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:72 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--brand-blue)', letterSpacing:'.12em', textTransform:'uppercase' }}>Simple Process</span>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,5vw,54px)', fontWeight:600, lineHeight:1.12, margin:'14px 0 14px' }}>How Synchro works</h2>
          <p style={{ fontSize:17, color:'var(--text2)', maxWidth:460, margin:'0 auto', lineHeight:1.7 }}>Four steps. Zero friction. Both parties protected.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:18 }}>
          {steps.map((s,i)=>(
            <div key={i}
              style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:20, padding:'28px 24px', position:'relative', overflow:'hidden', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.borderColor=s.color+'55';e.currentTarget.style.boxShadow=`0 20px 48px ${s.color}18`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none';}}>
              <div style={{ position:'absolute', top:12, right:18, fontFamily:'var(--font-display)', fontSize:56, fontWeight:800, color:s.color, opacity:.08, lineHeight:1, userSelect:'none' }}>{s.n}</div>
              <div style={{ width:44, height:44, borderRadius:12, background:s.color+'18', border:`1px solid ${s.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:18 }}>{s.icon}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, marginBottom:10, lineHeight:1.3 }}>{s.title}</h3>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.75 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Who It's For ────────────────────────────────────────────────────── */
function WhoItsFor() {
  const cards = [
    { icon:'💻', title:'Freelancers & Creatives', color:'var(--brand-blue)',
      items:['Web design & development','Photography & videography','Writing & content creation','Branding & graphic design'] },
    { icon:'🏢', title:'Businesses & Suppliers', color:'var(--gold)', featured:true,
      items:['Equipment & goods supply','B2B service contracts','Consulting & retainers','Product pre-orders'] },
    { icon:'🤝', title:'Any Buyer or Seller', color:'var(--green)',
      items:['Any product or service','Any deal size — KES 500+','Individual or company','One-time or recurring work'] },
  ];

  return (
    <section id="who" style={{ padding:'clamp(80px,10vw,140px) 20px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:72 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--brand-blue)', letterSpacing:'.12em', textTransform:'uppercase' }}>Who It's For</span>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,5vw,54px)', fontWeight:600, lineHeight:1.12, margin:'14px 0 14px' }}>Built for every deal in Kenya</h2>
          <p style={{ fontSize:17, color:'var(--text2)', maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>
            Whether it's KES 2,000 or KES 2,000,000 — if money and trust are involved, Synchro protects both sides.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:18 }}>
          {cards.map((c,i)=>(
            <div key={i}
              style={{ background:c.featured?'var(--gold-subtle)':'var(--surface)', border:`1px solid ${c.featured?'var(--gold-border)':'var(--border)'}`, borderRadius:20, padding:'32px 28px', position:'relative', overflow:'hidden', transition:'all .3s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.boxShadow='0 20px 48px rgba(0,0,0,.1)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
              {c.featured && <div style={{ position:'absolute', top:16, right:16, fontSize:9, fontWeight:800, color:'#080a0e', background:'var(--gold)', padding:'3px 10px', borderRadius:20, letterSpacing:'.1em', textTransform:'uppercase' }}>Popular</div>}
              <div style={{ width:48, height:48, borderRadius:14, background:c.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:18 }}>{c.icon}</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, marginBottom:16, color:c.featured?'var(--gold-light)':'var(--text)' }}>{c.title}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {c.items.map((item,j)=>(
                  <div key={j} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text2)' }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:c.color, flexShrink:0 }} />{item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Inclusive note */}
        <div style={{ marginTop:24, background:'var(--brand-blue-subtle)', border:'1px solid var(--brand-blue-border)', borderRadius:16, padding:'18px 24px', display:'flex', alignItems:'flex-start', gap:14 }}>
          <span style={{ fontSize:22, flexShrink:0 }}>💡</span>
          <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.65, margin:0 }}>
            <strong style={{ color:'var(--text)' }}>No minimum deal size, no exclusions.</strong> Synchro works for any transaction where trust matters — from a KES 1,000 logo to a KES 10M business contract. If you're exchanging money for a product or service, we protect you.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Powered By ──────────────────────────────────────────────────────── */
function PoweredBy() {
  const partners = [
    { name:'M-Pesa',          sub:'Instant STK Push',    bg:'#00a859', icon:'M', iconColor:'#fff' },
    { name:'Paystack',        sub:'Card payments',        bg:'#011b33', icon:'P', iconColor:'#00c3f7' },
    { name:"Africa's Talking",sub:'SMS notifications',   bg:'#1a1a2e', icon:'AT',iconColor:'#ff6b35' },
    { name:'SSL Encrypted',   sub:'256-bit security',    bg:'#052e16', icon:'🔒',iconColor:'#4ade80' },
  ];

  return (
    <section style={{ padding:'clamp(48px,6vw,72px) 20px', background:'var(--bg2)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ maxWidth:960, margin:'0 auto', textAlign:'center' }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:36 }}>Powered by trusted infrastructure</p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', alignItems:'center', flexWrap:'wrap' }}>
          {partners.map((p,i)=>(
            <div key={i}
              style={{ background:p.bg, borderRadius:14, padding:'14px 20px', display:'flex', alignItems:'center', gap:12, minWidth:180, boxShadow:'0 4px 16px rgba(0,0,0,.25)', transition:'transform .2s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-3px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='none'}>
              <div style={{ width:36, height:36, borderRadius:9, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:p.icon.length>1?11:17, fontWeight:800, color:p.iconColor, flexShrink:0 }}>{p.icon}</div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{p.name}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.55)', marginTop:1 }}>{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────────────── */
function Pricing() {
  const examples = [
    {deal:'KES 10,000',   fee:'KES 250',    net:'KES 9,750'},
    {deal:'KES 50,000',   fee:'KES 1,250',  net:'KES 48,750'},
    {deal:'KES 200,000',  fee:'KES 5,000',  net:'KES 195,000'},
    {deal:'KES 1,000,000',fee:'KES 25,000', net:'KES 975,000'},
  ];

  return (
    <section id="pricing" style={{ padding:'clamp(80px,10vw,140px) 20px' }}>
      <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--brand-blue)', letterSpacing:'.12em', textTransform:'uppercase' }}>Pricing</span>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,5vw,54px)', fontWeight:600, lineHeight:1.12, margin:'14px 0 14px' }}>One fee. No surprises.</h2>
        <p style={{ fontSize:17, color:'var(--text2)', lineHeight:1.75, marginBottom:52 }}>
          No monthly subscriptions. No setup fees. No hidden charges.<br/>
          You only pay when a deal successfully completes.
        </p>

        <div style={{ background:'var(--surface)', border:'1px solid var(--gold-border)', borderRadius:24, overflow:'hidden', boxShadow:'0 0 80px var(--gold-glow)', marginBottom:16 }}>
          {/* Big number */}
          <div style={{ padding:'44px 36px 32px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(68px,14vw,104px)', fontWeight:700, color:'var(--gold-light)', lineHeight:1 }}>
              2.5<span style={{ fontSize:'clamp(30px,5vw,44px)' }}>%</span>
            </div>
            <div style={{ fontSize:16, color:'var(--text2)', marginTop:10 }}>per completed transaction · deducted from seller payout</div>
          </div>

          {/* Examples */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
            {examples.map((ex,i)=>(
              <div key={i} style={{ padding:'16px 22px', borderRight:i%2===0?'1px solid var(--border)':'none', borderBottom:i<2?'1px solid var(--border)':'none', textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:5 }}>{ex.deal} deal</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3 }}>Fee: {ex.fee}</div>
                <div style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}>Seller gets: {ex.net}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ padding:'26px 36px' }}>
            <a href="#waitlist"
              style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,var(--brand-blue),var(--brand-blue-light))', color:'#fff', fontWeight:700, fontSize:15, padding:'14px 36px', borderRadius:12, textDecoration:'none', boxShadow:'0 8px 24px rgba(37,99,176,.3)', transition:'all .2s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='none'}>
              Get Early Access — It's Free
            </a>
          </div>
        </div>

        <p style={{ fontSize:13, color:'var(--text3)' }}>Buyers pay nothing extra · Free to sign up as a seller</p>
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState(null);
  const faqs = [
    {q:'What is escrow and why do I need it?', a:'Escrow means a neutral party holds the money until both sides agree the deal is done. Synchro sits in the middle — the buyer pays, the seller delivers, and only then does the money move. No more getting scammed, no more unpaid work.'},
    {q:'How does a buyer pay?', a:'Via M-Pesa STK Push (the phone prompt) or card through Paystack. No Synchro account needed — buyers just verify with a phone number or email.'},
    {q:'When does a seller receive their money?', a:"The moment the buyer confirms receipt, funds are released to M-Pesa or bank. Withdrawals process within 24 hours of approval."},
    {q:"What if there's a dispute?", a:'Either party can raise a dispute with a reason. Our team reviews the evidence — delivery proof, chat history — and resolves it within 48 hours, either releasing funds or issuing a refund.'},
    {q:'Is there a minimum or maximum deal size?', a:"Minimum is KES 500. There is no maximum — Synchro handles everything from small freelance gigs to large business contracts."},
    {q:"When is Synchro launching?", a:"We're in private beta right now, onboarding our first wave of users. Join the waitlist and you'll be among the first to get access."},
  ];

  return (
    <section id="faq" style={{ padding:'clamp(80px,10vw,140px) 20px', background:'var(--bg2)' }}>
      <div style={{ maxWidth:740, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--brand-blue)', letterSpacing:'.12em', textTransform:'uppercase' }}>FAQ</span>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(28px,5vw,50px)', fontWeight:600, lineHeight:1.12, margin:'14px 0 0' }}>Questions? Answered.</h2>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {faqs.map((faq,i)=>(
            <div key={i} style={{ background:'var(--surface)', border:`1px solid ${open===i?'var(--brand-blue-border)':'var(--border)'}`, borderRadius:14, overflow:'hidden', transition:'border-color .2s' }}>
              <button onClick={()=>setOpen(open===i?null:i)}
                style={{ width:'100%', padding:'18px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:12 }}>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', lineHeight:1.45 }}>{faq.q}</span>
                <span style={{ color:open===i?'var(--brand-blue)':'var(--text3)', flexShrink:0, fontSize:22, lineHeight:1, transition:'transform .2s,color .2s', transform:open===i?'rotate(45deg)':'none', fontWeight:300 }}>+</span>
              </button>
              {open===i && (
                <div style={{ padding:'0 20px 18px', fontSize:14, color:'var(--text2)', lineHeight:1.75, animation:'fadeUp .2s ease' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Waitlist ────────────────────────────────────────────────────────── */
function Waitlist() {
  const [form, setForm] = useState({name:'',email:'',role:'seller'});
  const [status, setStatus] = useState('idle'); // idle|loading|done|error
  const [errMsg, setErrMsg] = useState('');
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function submit(e) {
    e.preventDefault();
    if (!form.email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data = await res.json();
      if (!res.ok && !data.already) throw new Error(data.error||'Something went wrong');
      setStatus('done');
    } catch(err) { setErrMsg(err.message); setStatus('error'); }
  }

  const inp = { padding:'13px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', fontFamily:'var(--font-body)', transition:'border-color .2s', width:'100%', boxSizing:'border-box' };

  return (
    <section id="waitlist" style={{ padding:'clamp(80px,10vw,140px) 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(37,99,176,.08) 0%,transparent 55%)', pointerEvents:'none' }} />

      <div style={{ maxWidth:540, margin:'0 auto', textAlign:'center', position:'relative' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--brand-blue)', letterSpacing:'.12em', textTransform:'uppercase' }}>Early Access</span>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(34px,7vw,62px)', fontWeight:600, lineHeight:1.08, margin:'14px 0 16px' }}>
          Be the first<br/>to use Synchro.
        </h2>
        <p style={{ fontSize:16, color:'var(--text2)', lineHeight:1.8, marginBottom:44 }}>
          We're onboarding our founding users. Join the waitlist for early access and a direct line to our team.
        </p>

        {status==='done' ? (
          <div style={{ background:'rgba(34,197,94,.07)', border:'1px solid rgba(34,197,94,.2)', borderRadius:20, padding:'40px 28px', animation:'scaleIn .4s ease' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:600, marginBottom:10 }}>You're on the list!</h3>
            <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>
              We'll reach out at <strong style={{ color:'var(--text)' }}>{form.email}</strong> when it's your turn.<br/>
              Tell a friend — the more deals on Synchro, the safer everyone's money.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:22, padding:'clamp(24px,5vw,40px)', boxShadow:'0 24px 64px rgba(0,0,0,.12)' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
              <input value={form.name} onChange={set('name')} placeholder="Your full name" style={inp}
                onFocus={e=>e.target.style.borderColor='var(--brand-blue-border)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'} />
              <input value={form.email} onChange={set('email')} type="email" placeholder="Email address" required style={inp}
                onFocus={e=>e.target.style.borderColor='var(--brand-blue-border)'}
                onBlur={e=>e.target.style.borderColor='var(--border)'} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['seller',"I'm a Seller"],['buyer',"I'm a Buyer"],['both','Both']].map(([v,l])=>(
                  <button type="button" key={v} onClick={()=>setForm(p=>({...p,role:v}))}
                    style={{ padding:'11px 6px', borderRadius:10, border:`1px solid ${form.role===v?'var(--brand-blue-border)':'var(--border)'}`, background:form.role===v?'var(--brand-blue-subtle)':'var(--surface2)', color:form.role===v?'var(--brand-blue-light)':'var(--text2)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {status==='error' && <p style={{ fontSize:12, color:'#f87171', marginBottom:12, textAlign:'left' }}>{errMsg}</p>}

            <button type="submit" disabled={status==='loading'}
              style={{ width:'100%', padding:15, background:'linear-gradient(135deg,var(--brand-blue),var(--brand-blue-light))', color:'#fff', fontWeight:700, fontSize:15, borderRadius:12, border:'none', cursor:status==='loading'?'wait':'pointer', boxShadow:'0 8px 24px rgba(37,99,176,.35)', transition:'all .2s', opacity:status==='loading'?.7:1, letterSpacing:'.01em' }}>
              {status==='loading'?'Joining...':'Join the Waitlist →'}
            </button>
            <p style={{ fontSize:11, color:'var(--text3)', marginTop:14 }}>No spam. Only updates about your access.</p>
          </form>
        )}

        <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:24, flexWrap:'wrap' }}>
          {['🔒 No spam','🚀 Early access','🤝 Founder support'].map((t,i)=>(
            <span key={i} style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────── */
function Footer() {
  const { theme } = useTheme();
  return (
    <footer style={{ background:'var(--bg2)', borderTop:'1px solid var(--border)', padding:'clamp(40px,6vw,64px) 20px 28px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div className="ft-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:48 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <img src={theme==='dark'?'/synchro-logo-dark.jpeg':'/synchro-logo.jpeg'} alt="Synchro" style={{ width:28, height:28, borderRadius:6, objectFit:'cover' }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600 }}>Synchro</span>
            </div>
            <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.7, maxWidth:240, marginBottom:12 }}>Kenya's premium escrow platform. Every deal, protected.</p>
            <a href="mailto:support@synchro.co.ke" style={{ fontSize:12, color:'var(--text3)', textDecoration:'none', transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='var(--brand-blue)'}
              onMouseLeave={e=>e.target.style.color='var(--text3)'}>support@synchro.co.ke</a>
          </div>
          {[
            {title:'Product',links:['Payment Links','How It Works','Pricing','Security']},
            {title:'Company',links:['About','Blog','Careers','Contact']},
            {title:'Legal',  links:['Terms of Service','Privacy Policy','Escrow Policy','Cookies']},
          ].map((col,i)=>(
            <div key={i}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--text3)', letterSpacing:'.12em', textTransform:'uppercase', marginBottom:16 }}>{col.title}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {col.links.map(l=>(
                  <a key={l} href="#" style={{ fontSize:13, color:'var(--text2)', textDecoration:'none', transition:'color .15s' }}
                    onMouseEnter={e=>e.target.style.color='var(--text)'}
                    onMouseLeave={e=>e.target.style.color='var(--text2)'}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <span style={{ fontSize:12, color:'var(--text3)' }}>© 2025 Synchro Technologies Ltd · Nairobi, Kenya</span>
          <div style={{ display:'flex', gap:16 }}>
            {['Twitter','LinkedIn','Instagram'].map(s=>(
              <a key={s} href="#" style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e=>e.target.style.color='var(--brand-blue)'}
                onMouseLeave={e=>e.target.style.color='var(--text3)'}>{s}</a>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media(max-width:768px){.ft-grid{grid-template-columns:1fr 1fr!important;gap:28px!important}}
        @media(max-width:480px){.ft-grid{grid-template-columns:1fr!important}}
      `}</style>
    </footer>
  );
}

/* ─── Export ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhoItsFor />
      <PoweredBy />
      <Pricing />
      <FAQ />
      <Waitlist />
      <Footer />
    </>
  );
}