import { useState, useEffect } from 'react';
import { sellerAPI } from '../../services/api';
import { useToast }  from '../../components/Toast';
import { Card, Btn, Inp, Modal, Empty, Skeleton, StatCard, GoldLine } from '../../components/UI';

function fmt(n)     { return `KES ${Number(n||0).toLocaleString()}`; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }

const WR_STYLE = {
  pending:  { bg:'rgba(245,158,11,.1)',  color:'#fbbf24' },
  approved: { bg:'rgba(34,197,94,.1)',   color:'#4ade80' },
  paid:     { bg:'rgba(201,168,76,.1)',  color:'#e8c86a' },
  rejected: { bg:'rgba(239,68,68,.1)',   color:'#f87171' },
};

function WrBadge({ status }) {
  const s = WR_STYLE[status] || WR_STYLE.pending;
  return <span style={{ background:s.bg, color:s.color, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' }}>{status}</span>;
}

export default function SellerPayouts() {
  const { toast }   = useToast();
  const [summary,   setSummary]   = useState(null);
  const [accounts,  setAccounts]  = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [accType,   setAccType]   = useState('mpesa');
  const [formAcc,   setFormAcc]   = useState({ mpesa_phone:'', bank_name:'', account_number:'', account_name:'' });
  const [formWr,    setFormWr]    = useState({ amount:'' });
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([sellerAPI.summary(), sellerAPI.bankAccounts(), sellerAPI.withdrawals()])
      .then(([s, acc, wr]) => { setSummary(s); setAccounts(acc); setHistory(wr); })
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, []);

  const setA = k => e => setFormAcc(p => ({ ...p, [k]: e.target.value }));
  const setW = k => e => setFormWr(p => ({ ...p, [k]: e.target.value }));

  async function addAccount(e) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = accType==='mpesa'
        ? { mpesa_phone: formAcc.mpesa_phone }
        : { bank_name: formAcc.bank_name, account_number: formAcc.account_number, account_name: formAcc.account_name };
      const acc = await sellerAPI.addBankAccount(payload);
      setAccounts(p => [acc, ...p.map(a => ({ ...a, is_primary:false }))]);
      toast('Payout account added.','success');
      setModal(null); setFormAcc({ mpesa_phone:'', bank_name:'', account_number:'', account_name:'' });
    } catch(err) { toast(err.message,'error'); }
    finally { setSaving(false); }
  }

  async function deleteAccount(id) {
    if (!window.confirm('Remove this payout account?')) return;
    try { await sellerAPI.deleteBankAccount(id); setAccounts(p => p.filter(a => a.id!==id)); toast('Account removed.','success'); }
    catch(e) { toast(e.message,'error'); }
  }

  async function requestWithdrawal(e) {
    e.preventDefault(); setSaving(true);
    try {
      const wr = await sellerAPI.withdraw({ amount: parseFloat(formWr.amount) });
      setHistory(p => [wr, ...p]);
      toast('Withdrawal request submitted. Admin will process within 24h.','success');
      setModal(null); setFormWr({ amount:'' });
    } catch(err) { toast(err.message,'error'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Payouts</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Manage your earnings and withdrawal requests.</p>
      </div>

      {/* Balance stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        {loading ? Array(3).fill(0).map((_,i) => <Card key={i} style={{ height:100 }}><Skeleton h={100} /></Card>) : <>
          <StatCard label="Available Balance" value={fmt(summary?.available_balance)} sub="Ready to withdraw" gold delay={0} />
          <StatCard label="Total Earned"      value={fmt(summary?.total_earned)}      sub="All time"         delay={.05} />
          <StatCard label="Total Withdrawn"   value={fmt(summary?.total_withdrawn)}   sub="All time"         delay={.1} />
        </>}
      </div>

      {/* Withdraw CTA */}
      <Card gold style={{ padding:'20px 24px', marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'center', animation:'fadeUp .4s .2s ease both', flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>Ready to withdraw?</div>
          <div style={{ fontSize:13, color:'var(--text2)' }}>Funds sent to your primary account via M-Pesa within 24h.</div>
        </div>
        <Btn onClick={() => accounts.length === 0 ? toast('Add a payout account first.','warning') : setModal('withdraw')} size="lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          Withdraw Funds
        </Btn>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>

        {/* Payout accounts */}
        <Card style={{ animation:'fadeUp .4s .25s ease both' }}>
          <div style={{ padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Payout Accounts</h2>
            <Btn size="sm" variant="gold" onClick={() => setModal('add-account')}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </Btn>
          </div>
          <GoldLine />
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              {Array(2).fill(0).map((_,i) => <Skeleton key={i} h={56} style={{ borderRadius:10 }} />)}
            </div>
          ) : accounts.length === 0 ? (
            <Empty icon="🏦" title="No accounts yet" sub="Add an M-Pesa number or bank account." />
          ) : accounts.map(acc => (
            <div key={acc.id} style={{ padding:'12px 22px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{ width:36, height:36, borderRadius:10, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {acc.mpesa_phone ? '📱' : '🏦'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.mpesa_phone || acc.bank_name}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{acc.mpesa_phone || acc.account_number}</div>
              </div>
              {acc.is_primary && <span style={{ fontSize:9, fontWeight:700, color:'var(--gold)', letterSpacing:'.08em', textTransform:'uppercase', background:'var(--gold-subtle)', padding:'2px 8px', borderRadius:4, border:'1px solid var(--gold-border)', flexShrink:0 }}>Primary</span>}
              <Btn size="sm" variant="danger" onClick={() => deleteAccount(acc.id)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </Btn>
            </div>
          ))}
        </Card>

        {/* Withdrawal history */}
        <Card style={{ animation:'fadeUp .4s .3s ease both' }}>
          <div style={{ padding:'18px 22px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>Withdrawal History</h2>
          </div>
          <GoldLine />
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              {Array(3).fill(0).map((_,i) => <Skeleton key={i} h={52} style={{ borderRadius:10 }} />)}
            </div>
          ) : history.length === 0 ? (
            <Empty icon="📊" title="No withdrawals yet" sub="Your withdrawal history will appear here." />
          ) : history.map(wr => (
            <div key={wr.id} style={{ padding:'12px 22px', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600 }}>{fmt(wr.amount)}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{fmtDate(wr.created_at)}</div>
              </div>
              <WrBadge status={wr.status} />
            </div>
          ))}
        </Card>
      </div>

      {/* Add account modal */}
      <Modal open={modal==='add-account'} onClose={() => setModal(null)} title="Add Payout Account">
        <form onSubmit={addAccount} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {['mpesa','bank'].map(t => (
              <button type="button" key={t} onClick={() => setAccType(t)}
                style={{ padding:'10px 0', borderRadius:8, border:`1px solid ${accType===t?'var(--gold-border)':'var(--border)'}`, background: accType===t?'var(--gold-subtle)':'var(--surface2)', color: accType===t?'var(--gold-light)':'var(--text2)', fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all .15s' }}>
                {t === 'mpesa' ? '📱 M-Pesa' : '🏦 Bank Account'}
              </button>
            ))}
          </div>
          {accType === 'mpesa' ? (
            <Inp label="M-Pesa Phone Number" placeholder="+254 7XX XXX XXX" value={formAcc.mpesa_phone} onChange={setA('mpesa_phone')} required />
          ) : <>
            <Inp label="Bank Name" placeholder="e.g. KCB, Equity, Co-op" value={formAcc.bank_name} onChange={setA('bank_name')} required />
            <Inp label="Account Number" placeholder="Your bank account number" value={formAcc.account_number} onChange={setA('account_number')} required />
            <Inp label="Account Name" placeholder="Name on the account" value={formAcc.account_name} onChange={setA('account_name')} required />
          </>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn type="submit" loading={saving}>Add Account</Btn>
          </div>
        </form>
      </Modal>

      {/* Withdraw modal */}
      <Modal open={modal==='withdraw'} onClose={() => setModal(null)} title="Withdraw Funds">
        <form onSubmit={requestWithdrawal} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--gold-subtle)', border:'1px solid var(--gold-border)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--gold)', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>Available Balance</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:600, color:'var(--gold-light)' }}>{fmt(summary?.available_balance)}</div>
          </div>
          <Inp label="Amount (KES)" type="number" placeholder="Minimum KES 100" value={formWr.amount} onChange={setW('amount')} prefix="KES" required />
          {accounts.find(a => a.is_primary) && (
            <div style={{ fontSize:12, color:'var(--text3)', background:'var(--surface2)', padding:'10px 14px', borderRadius:8 }}>
              Will be sent to: <strong style={{ color:'var(--text)' }}>{accounts.find(a=>a.is_primary)?.mpesa_phone || accounts.find(a=>a.is_primary)?.bank_name}</strong>
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn type="submit" loading={saving}>Request Withdrawal</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}