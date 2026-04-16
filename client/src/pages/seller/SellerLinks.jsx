import { useState, useEffect } from 'react';
import { linksAPI }  from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Card, Btn, Inp, Modal, Empty, Skeleton, CopyBtn, GoldLine } from '../../components/UI';

const ORIGIN = window.location.origin;

function LinkCard({ link, onEdit, onDelete, onStats, onToggle }) {
  const url = `${ORIGIN}/pay/${link.slug}`;
  return (
    <Card hover style={{ overflow:'hidden' }}>
      <div style={{ height:2, background: link.is_active ? 'linear-gradient(90deg,var(--gold),var(--gold-dim))' : 'var(--border)' }} />
      <div style={{ padding:'20px 22px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{link.title}</h3>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--text3)', background:'var(--surface2)', padding:'2px 8px', borderRadius:4 }}>{link.link_type}</span>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, color:'var(--gold-light)' }}>
              {link.amount ? `KES ${Number(link.amount).toLocaleString()}` : 'Negotiable'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:20, marginBottom:16 }}>
          {[['Views',link.views??0],['Paid',link.paid_count??0],['Done',link.completed_count??0]].map(([l,v]) => (
            <div key={l}>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:'var(--font-display)' }}>{v}</div>
              <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface2)', borderRadius:8, padding:'7px 12px', marginBottom:14, border:'1px solid var(--border)' }}>
          <span style={{ flex:1, fontSize:11, color:'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>{url}</span>
          <CopyBtn text={url} />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <Btn size="sm" variant="ghost" onClick={() => onEdit(link)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => onStats(link)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Stats
          </Btn>
          <Btn size="sm" variant={link.is_active ? 'warning' : 'success'} onClick={() => onToggle(link)}>
            {link.is_active
              ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</>
              : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> Activate</>
            }
          </Btn>
          <Btn size="sm" variant="danger" onClick={() => onDelete(link.id)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            Delete
          </Btn>
        </div>
      </div>
    </Card>
  );
}

function LinkForm({ initial, onSave, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initial || { title:'', description:'', link_type:'fixed', amount:'', min_amount:'', max_amount:'', delivery_days:'7' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, delivery_days: parseInt(form.delivery_days)||7 };
      if (form.amount)     payload.amount     = parseFloat(form.amount);
      if (form.min_amount) payload.min_amount = parseFloat(form.min_amount);
      if (form.max_amount) payload.max_amount = parseFloat(form.max_amount);
      const res = initial ? await linksAPI.update(initial.id, payload) : await linksAPI.create(payload);
      toast(initial ? 'Link updated.' : 'Link created!', 'success');
      onSave(res);
    } catch(err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Inp label="Title" placeholder="e.g. Web Design Project" value={form.title} onChange={set('title')} required />
      <Inp label="Description" placeholder="Describe what the buyer is paying for…" textarea rows={3} value={form.description} onChange={set('description')} />

      <div>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Link Type</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {['fixed','negotiable','milestone'].map(t => (
            <button type="button" key={t} onClick={() => setForm(p=>({...p,link_type:t}))}
              style={{ padding:'10px 0', borderRadius:8, border:`1px solid ${form.link_type===t?'var(--gold-border)':'var(--border)'}`, background: form.link_type===t?'var(--gold-subtle)':'var(--surface2)', color: form.link_type===t?'var(--gold-light)':'var(--text2)', fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {form.link_type === 'fixed' && (
        <Inp label="Amount (KES)" type="number" placeholder="5000" value={form.amount} onChange={set('amount')} prefix="KES" required />
      )}
      {form.link_type === 'negotiable' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Inp label="Min Amount" type="number" placeholder="1000" value={form.min_amount} onChange={set('min_amount')} prefix="KES" />
          <Inp label="Max Amount" type="number" placeholder="50000" value={form.max_amount} onChange={set('max_amount')} prefix="KES" />
        </div>
      )}
      <Inp label="Delivery Days" type="number" placeholder="7" value={form.delivery_days} onChange={set('delivery_days')} suffix="days" />

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
        <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" loading={loading}>{initial ? 'Save Changes' : 'Create Link'}</Btn>
      </div>
    </form>
  );
}

function StatsModal({ link, onClose }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { linksAPI.stats(link.id).then(setStats).catch(console.error); }, [link.id]);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {!stats ? Array(4).fill(0).map((_,i) => <Skeleton key={i} h={48} style={{ borderRadius:10 }} />) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            ['Views',          stats.views],
            ['Conversion',     `${stats.conversion_rate}%`],
            ['Revenue',        `KES ${Number(stats.total_revenue).toLocaleString()}`],
            ['Completed',      stats.completed],
            ['Funded',         stats.funded],
            ['Disputed',       stats.disputed],
          ].map(([l,v]) => (
            <div key={l} style={{ background:'var(--surface2)', borderRadius:10, padding:'14px 16px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>{l}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      <Btn variant="secondary" onClick={onClose} full>Close</Btn>
    </div>
  );
}

export default function SellerLinks() {
  const { toast } = useToast();
  const [links,   setLinks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [target,  setTarget]  = useState(null);

  useEffect(() => {
    linksAPI.list().then(setLinks).catch(e => toast(e.message,'error')).finally(() => setLoading(false));
  }, []);

  async function handleToggle(link) {
    try {
      const res = await linksAPI.update(link.id, { is_active: !link.is_active });
      setLinks(p => p.map(l => l.id === res.id ? res : l));
      toast(res.is_active ? 'Link activated.' : 'Link paused.', 'success');
    } catch(e) { toast(e.message, 'error'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this payment link?')) return;
    try { await linksAPI.delete(id); setLinks(p => p.filter(l => l.id !== id)); toast('Link deleted.','success'); }
    catch(e) { toast(e.message,'error'); }
  }

  function handleSaved(link) {
    setLinks(p => modal==='edit' ? p.map(l => l.id===link.id ? link : l) : [link,...p]);
    setModal(null); setTarget(null);
  }

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Payment Links</h1>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Create and share links to receive secure escrow payments.</p>
        </div>
        <Btn onClick={() => { setTarget(null); setModal('create'); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Link
        </Btn>
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {Array(3).fill(0).map((_,i) => <Card key={i} style={{ height:220 }}><Skeleton h={220} /></Card>)}
        </div>
      ) : links.length === 0 ? (
        <Empty icon="🔗" title="No payment links yet" sub="Create your first link and share it with your buyers."
          action={<Btn onClick={() => setModal('create')}>Create First Link</Btn>} />
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {links.map(l => <LinkCard key={l.id} link={l} onEdit={l => { setTarget(l); setModal('edit'); }} onDelete={handleDelete} onStats={l => { setTarget(l); setModal('stats'); }} onToggle={handleToggle} />)}
        </div>
      )}

      <Modal open={modal==='create'||modal==='edit'} onClose={() => { setModal(null); setTarget(null); }} title={modal==='edit' ? 'Edit Link' : 'New Payment Link'}>
        <LinkForm initial={target} onSave={handleSaved} onClose={() => { setModal(null); setTarget(null); }} />
      </Modal>

      <Modal open={modal==='stats'} onClose={() => { setModal(null); setTarget(null); }} title={`Stats — ${target?.title}`}>
        {target && <StatsModal link={target} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}