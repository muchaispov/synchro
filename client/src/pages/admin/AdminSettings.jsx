import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useToast } from '../../components/Toast';
import { Card, Btn, Inp, GoldLine, Skeleton } from '../../components/UI';

export default function AdminSettings() {
  const { toast }  = useToast();
  const [settings, setSettings] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({
    platform_fee_percent: '',
    maintenance_mode:     'false',
    min_withdrawal:       '100',
    max_withdrawal:       '1000000',
  });

  useEffect(() => {
    adminAPI.getSettings()
      .then(data => {
        setSettings(data);
        setForm(p => ({ ...p, ...data }));
      })
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.updateSettings(form);
      toast('Settings saved.', 'success');
    } catch(err) { toast(err.message,'error'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:600 }}>
      {Array(4).fill(0).map((_,i) => <Skeleton key={i} h={56} style={{ borderRadius:10 }} />)}
    </div>
  );

  return (
    <div style={{ animation:'fadeIn .4s ease', maxWidth:600 }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Platform Settings</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Configure fees, limits and platform behaviour.</p>
      </div>

      <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Fees */}
        <Card style={{ animation:'fadeUp .4s ease' }}>
          <div style={{ padding:'18px 22px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Transaction Fees</h2>
          </div>
          <GoldLine />
          <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16 }}>
            <Inp label="Platform Fee (%)" type="number" step="0.1" min="0" max="10"
              value={form.platform_fee_percent} onChange={set('platform_fee_percent')}
              hint="Percentage deducted from each transaction as platform revenue" suffix="%" />

            {/* Fee preview */}
            {form.platform_fee_percent && (
              <div style={{ background:'var(--gold-subtle)', border:'1px solid var(--gold-border)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--text2)' }}>
                On a KES 10,000 transaction: platform earns KES {Math.round(10000 * parseFloat(form.platform_fee_percent || 0) / 100).toLocaleString()}, seller receives KES {Math.round(10000 * (1 - parseFloat(form.platform_fee_percent || 0) / 100)).toLocaleString()}
              </div>
            )}
          </div>
        </Card>

        {/* Withdrawals */}
        <Card style={{ animation:'fadeUp .4s .08s ease both' }}>
          <div style={{ padding:'18px 22px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Withdrawal Limits</h2>
          </div>
          <GoldLine />
          <div style={{ padding:'20px 22px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Inp label="Minimum Withdrawal" type="number" value={form.min_withdrawal} onChange={set('min_withdrawal')} prefix="KES" />
            <Inp label="Maximum Withdrawal" type="number" value={form.max_withdrawal} onChange={set('max_withdrawal')} prefix="KES" />
          </div>
        </Card>

        {/* Maintenance mode */}
        <Card style={{ animation:'fadeUp .4s .16s ease both' }}>
          <div style={{ padding:'18px 22px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Maintenance Mode</h2>
          </div>
          <GoldLine />
          <div style={{ padding:'20px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Take platform offline</div>
              <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>Buyers will see a maintenance message. Existing orders are unaffected.</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {['false','true'].map(v => (
                <button type="button" key={v} onClick={() => setForm(p => ({ ...p, maintenance_mode: v }))}
                  style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${form.maintenance_mode===v ? (v==='true'?'rgba(239,68,68,.4)':'rgba(34,197,94,.4)') : 'var(--border)'}`, background: form.maintenance_mode===v ? (v==='true'?'rgba(239,68,68,.1)':'rgba(34,197,94,.1)') : 'var(--surface2)', color: form.maintenance_mode===v ? (v==='true'?'#f87171':'#4ade80') : 'var(--text3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
                  {v === 'true' ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <Btn type="submit" loading={saving} size="lg">Save Settings</Btn>
        </div>
      </form>
    </div>
  );
}
