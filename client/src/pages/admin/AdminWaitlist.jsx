import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { Card, Skeleton, Empty } from '../../components/UI';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

const ROLE_STYLE = {
  seller: { bg:'rgba(201,168,76,.1)',  color:'var(--gold)',        label:'Seller' },
  buyer:  { bg:'rgba(59,130,246,.1)',  color:'var(--brand-blue-light)', label:'Buyer' },
  both:   { bg:'rgba(34,197,94,.1)',   color:'var(--green)',       label:'Both' },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.both;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

export default function AdminWaitlist() {
  const { toast }  = useToast();
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');
  const [filter,   setFilter]  = useState('all');

  useEffect(() => {
    fetch('/api/waitlist', {
      headers: { Authorization: `Bearer ${localStorage.getItem('synchro_token')}` }
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast('Could not load waitlist', 'error'))
      .finally(() => setLoading(false));
  }, []);

  function copyCSV() {
    if (!data?.entries) return;
    const rows = [['Name','Email','Role','Joined'],...data.entries.map(e => [e.name||'—', e.email, e.role, fmtDate(e.created_at)])];
    const csv  = rows.map(r => r.join(',')).join('\n');
    navigator.clipboard.writeText(csv);
    toast('Copied as CSV!', 'success');
  }

  const visible = (data?.entries || []).filter(e => {
    const matchFilter = filter === 'all' || e.role === filter;
    const matchSearch = !search || e.email.toLowerCase().includes(search.toLowerCase()) || (e.name||'').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = (data?.entries || []).reduce((acc, e) => { acc[e.role] = (acc[e.role]||0)+1; return acc; }, {});

  return (
    <div style={{ animation: 'fadeIn .4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, marginBottom: 6 }}>Waitlist</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>Everyone who signed up for early access.</p>
        </div>
        <button onClick={copyCSV} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--gold-border)'; e.currentTarget.style.color='var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
          Copy as CSV
        </button>
      </div>

      {/* Stats row */}
      {data && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Signups', val: data.count, color: 'var(--text)' },
            { label: 'Sellers',       val: counts.seller||0, color: 'var(--gold)' },
            { label: 'Buyers',        val: counts.buyer||0,  color: 'var(--brand-blue-light)' },
            { label: 'Both',          val: counts.both||0,   color: 'var(--green)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all','seller','buyer','both'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 13px', borderRadius: 20, border: `1px solid ${filter===f?'var(--gold-border)':'var(--border)'}`, background: filter===f?'var(--gold-subtle)':'transparent', color: filter===f?'var(--gold-light)':'var(--text3)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s' }}>
              {f}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 13px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' }} />
      </div>

      {/* Table */}
      <Card>
        <div style={{ padding: '11px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1.4fr 90px 140px', gap: 12, fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          <span>Name</span><span>Email</span><span>Role</span><span>Joined</span>
        </div>

        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array(6).fill(0).map((_,i) => <Skeleton key={i} h={44} style={{ borderRadius: 8 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <Empty icon="📋" title="No signups yet" sub={search ? 'No results for that search.' : 'Share the landing page to get signups!'} />
        ) : visible.map((e, i) => (
          <div key={e.id} style={{ padding: '13px 20px', display: 'grid', gridTemplateColumns: '1fr 1.4fr 90px 140px', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
            onMouseEnter={el => el.currentTarget.style.background='var(--surface2)'}
            onMouseLeave={el => el.currentTarget.style.background='transparent'}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name || <span style={{ color: 'var(--text3)' }}>—</span>}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</div>
            <RoleBadge role={e.role} />
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(e.created_at)}</div>
          </div>
        ))}

        {visible.length > 0 && (
          <div style={{ padding: '10px 20px', fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
            Showing {visible.length} of {data?.count || 0} signups
          </div>
        )}
      </Card>
    </div>
  );
}