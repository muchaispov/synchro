import { useState, useEffect, useRef } from 'react';
import { txAPI }    from '../../services/api';
import { useToast } from '../../components/Toast';
import { useAuth }  from '../../context/AuthContext';
import { Card, Btn, Inp, Badge, Empty, Skeleton, Modal, GoldLine } from '../../components/UI';

function fmt(n)      { return `KES ${Number(n||0).toLocaleString()}`; }
function fmtDate(d)  { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function fmtShort(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}); }

const FILTERS = ['ALL','PENDING','FUNDED','DELIVERED','COMPLETED','DISPUTED'];

/* ── Inline chat panel ─────────────────────────────────────────────────────── */
function ChatPanel({ tx, currentUserId }) {
  const { toast }  = useToast();
  const [msgs,     setMsgs]     = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [loadingM, setLoadingM] = useState(true);
  const bottom = useRef(null);

  useEffect(() => {
    setLoadingM(true);
    txAPI.messages(tx.id).then(setMsgs).catch(e => toast(e.message,'error')).finally(() => setLoadingM(false));
  }, [tx.id]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try { const m = await txAPI.sendMsg(tx.id,{body:text.trim()}); setMsgs(p=>[...p,m]); setText(''); }
    catch(e) { toast(e.message,'error'); }
    finally { setSending(false); }
  }

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden' }}>
      <div style={{ padding:'8px 14px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase' }}>Conversation</div>
      <div style={{ height:280, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
        {loadingM ? Array(3).fill(0).map((_,i)=><Skeleton key={i} h={32} style={{borderRadius:8}}/>) :
         msgs.length===0 ? <div style={{textAlign:'center',color:'var(--text3)',fontSize:12,marginTop:24}}>No messages yet.</div> :
         msgs.map(m => {
           const mine = m.sender?.id === currentUserId;
           return (
             <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:mine?'flex-end':'flex-start'}}>
               <div style={{fontSize:9,color:'var(--text3)',marginBottom:2}}>{mine?'You':m.sender?.full_name} · {fmtShort(m.created_at)}</div>
               <div style={{maxWidth:'78%',padding:'8px 12px',borderRadius:mine?'12px 12px 3px 12px':'12px 12px 12px 3px',background:mine?'var(--gold-subtle)':'var(--surface2)',border:`1px solid ${mine?'var(--gold-border)':'var(--border)'}`,fontSize:13,lineHeight:1.5}}>{m.body}</div>
             </div>
           );
         })}
        <div ref={bottom}/>
      </div>
      <div style={{padding:10,borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
          placeholder="Type a message…" style={{flex:1,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text)',fontSize:13,outline:'none',fontFamily:'var(--font-body)'}}/>
        <Btn onClick={send} loading={sending} size="sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </Btn>
      </div>
    </div>
  );
}

/* ── Order detail drawer ───────────────────────────────────────────────────── */
function OrderDrawer({ tx, currentUserId, onClose, onDeliver }) {
  const TIMELINE = [
    { status:'PENDING',   label:'Order Created',       date: tx.created_at,   done: true },
    { status:'FUNDED',    label:'Payment Received',    date: tx.funded_at,    done: ['FUNDED','DELIVERED','COMPLETED','DISPUTED'].includes(tx.status) },
    { status:'DELIVERED', label:'Marked as Delivered', date: tx.delivered_at, done: ['DELIVERED','COMPLETED','DISPUTED'].includes(tx.status) },
    { status:'COMPLETED', label:'Buyer Confirmed',     date: tx.completed_at, done: tx.status==='COMPLETED' },
  ];

  return (
    <div style={{position:'fixed',inset:0,zIndex:900,display:'flex',justifyContent:'flex-end',background:'rgba(8,10,14,.75)',backdropFilter:'blur(8px)',animation:'fadeIn .2s ease'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:500,maxWidth:'95vw',background:'var(--surface)',borderLeft:'1px solid var(--gold-border)',display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',animation:'toastIn .3s ease'}}>

        {/* Sticky header */}
        <div style={{padding:'20px 22px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'sticky',top:0,background:'var(--surface)',zIndex:10}}>
          <div style={{flex:1,minWidth:0,marginRight:12}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.title}</div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:10,color:'var(--text3)',fontFamily:'monospace'}}>{tx.reference}</span>
              <Badge status={tx.status}/>
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:4,flexShrink:0}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{padding:22,display:'flex',flexDirection:'column',gap:18}}>

          {/* Amount breakdown */}
          <div style={{background:'var(--surface2)',borderRadius:'var(--r)',padding:'14px 16px',border:'1px solid var(--border)',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            {[['Order Amount',fmt(tx.amount),'var(--text)'],['Platform Fee',fmt(tx.platform_fee),'var(--text3)'],['You Receive',fmt(tx.seller_receives),'var(--gold-light)']].map(([l,v,c])=>(
              <div key={l}>
                <div style={{fontSize:9,color:'var(--text3)',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>{l}</div>
                <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:600,color:c}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Parties */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[['Buyer',tx.buyer],['Seller',tx.seller]].map(([l,p])=>(
              <div key={l} style={{background:'var(--surface2)',borderRadius:'var(--r)',padding:'12px 14px',border:'1px solid var(--border)'}}>
                <div style={{fontSize:9,color:'var(--text3)',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:5}}>{l}</div>
                <div style={{fontSize:13,fontWeight:600}}>{p?.full_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{p?.phone||p?.email}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>Timeline</div>
            {TIMELINE.map((step,i)=>(
              <div key={step.status} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom: i<TIMELINE.length-1?0:0}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${step.done?'var(--gold)':'var(--border2)'}`,background:step.done?'var(--gold-subtle)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {step.done&&<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  {i<TIMELINE.length-1&&<div style={{width:1,height:22,background:step.done?'var(--gold-border)':'var(--border)',margin:'2px 0'}}/>}
                </div>
                <div style={{paddingBottom:i<TIMELINE.length-1?6:0,paddingTop:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:step.done?'var(--text)':'var(--text3)'}}>{step.label}</div>
                  {step.date&&<div style={{fontSize:10,color:'var(--text3)'}}>{fmtDate(step.date)}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery proof */}
          {(tx.delivery_notes||tx.delivery_proof_url)&&(
            <div style={{background:'rgba(59,130,246,.06)',border:'1px solid rgba(59,130,246,.2)',borderRadius:'var(--r)',padding:'12px 14px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#60a5fa',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:6}}>Delivery Proof</div>
              {tx.delivery_notes&&<p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:6}}>{tx.delivery_notes}</p>}
              {tx.delivery_proof_url&&<a href={tx.delivery_proof_url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'#60a5fa',display:'flex',alignItems:'center',gap:4}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View Proof
              </a>}
            </div>
          )}

          {/* Dispute */}
          {tx.dispute_reason&&(
            <div style={{background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.2)',borderRadius:'var(--r)',padding:'12px 14px'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#f87171',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:5}}>Dispute Reason</div>
              <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>{tx.dispute_reason}</p>
              {tx.admin_note&&<p style={{fontSize:12,color:'var(--text3)',marginTop:8,borderTop:'1px solid rgba(239,68,68,.1)',paddingTop:8}}>Admin: {tx.admin_note}</p>}
            </div>
          )}

          {/* Chat */}
          <ChatPanel tx={tx} currentUserId={currentUserId}/>

          {/* Action */}
          {tx.status==='FUNDED'&&(
            <Btn variant="success" full onClick={()=>onDeliver(tx)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Mark as Delivered
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Deliver modal ─────────────────────────────────────────────────────────── */
function DeliverModal({ tx, onDelivered, onClose }) {
  const { toast } = useToast();
  const [form, setForm]       = useState({ notes:'', proof_url:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try { const res = await txAPI.deliver(tx.id,form); toast('Marked as delivered!','success'); onDelivered(res); }
    catch(err) { toast(err.message,'error'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
      <p style={{fontSize:13,color:'var(--text2)',lineHeight:1.6}}>Confirm you've delivered <strong style={{color:'var(--text)'}}>{tx.title}</strong>.</p>
      <Inp label="Delivery Notes" textarea rows={3} placeholder="Describe what was delivered…" value={form.notes} onChange={set('notes')}/>
      <Inp label="Proof URL (optional)" placeholder="https://drive.google.com/..." value={form.proof_url} onChange={set('proof_url')} hint="Screenshot, Drive link, or portfolio URL"/>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <Btn type="button" variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn type="submit" variant="success" loading={loading}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Mark Delivered
        </Btn>
      </div>
    </form>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function SellerOrders() {
  const { toast } = useToast();
  const { user }  = useAuth();
  const [txs,     setTxs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('ALL');
  const [detail,  setDetail]  = useState(null);
  const [deliver, setDeliver] = useState(null);

  useEffect(() => {
    txAPI.list({ role:'seller' }).then(setTxs).catch(e => toast(e.message,'error')).finally(()=>setLoading(false));
  }, []);

  const visible      = filter==='ALL' ? txs : txs.filter(t=>t.status===filter);
  const fundedCount  = txs.filter(t=>t.status==='FUNDED').length;
  const disputeCount = txs.filter(t=>t.status==='DISPUTED').length;

  function handleDelivered(updated) {
    setTxs(p => p.map(t => t.id===updated.id ? updated : t));
    setDetail(updated);
    setDeliver(null);
  }

  return (
    <div style={{animation:'fadeIn .4s ease'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:500,marginBottom:6}}>Orders</h1>
        <p style={{fontSize:13,color:'var(--text2)'}}>Track and manage your escrow transactions.</p>
      </div>

      {/* Alert banners */}
      {fundedCount>0&&(
        <div style={{background:'rgba(201,168,76,.08)',border:'1px solid var(--gold-border)',borderRadius:'var(--r)',padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10,animation:'fadeUp .3s ease'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{fontSize:13,color:'var(--gold-light)'}}><strong>{fundedCount}</strong> order{fundedCount>1?'s':''} waiting to be delivered.</span>
          <button onClick={()=>setFilter('FUNDED')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:12,color:'var(--gold)',fontWeight:700}}>View →</button>
        </div>
      )}
      {disputeCount>0&&(
        <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:'var(--r)',padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{fontSize:13,color:'#f87171'}}><strong>{disputeCount}</strong> dispute{disputeCount>1?'s':''} open.</span>
          <button onClick={()=>setFilter('DISPUTED')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#f87171',fontWeight:700}}>View →</button>
        </div>
      )}

      {/* Filter pills */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
        {FILTERS.map(f=>{
          const c=f==='ALL'?txs.length:txs.filter(t=>t.status===f).length;
          return(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 14px',borderRadius:20,border:`1px solid ${filter===f?'var(--gold-border)':'var(--border)'}`,background:filter===f?'var(--gold-subtle)':'transparent',color:filter===f?'var(--gold-light)':'var(--text3)',fontSize:11,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer',fontFamily:'var(--font-body)',transition:'all .15s',display:'flex',alignItems:'center',gap:6}}>
              {f}{c>0&&<span style={{background:filter===f?'var(--gold)':'var(--surface3)',color:filter===f?'#080a0e':'var(--text3)',borderRadius:10,padding:'1px 6px',fontSize:9}}>{c}</span>}
            </button>
          );
        })}
      </div>

      {/* Orders */}
      {loading ? (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {Array(5).fill(0).map((_,i)=><Skeleton key={i} h={72} style={{borderRadius:12}}/>)}
        </div>
      ) : visible.length===0 ? (
        <Empty icon="📋" title="No orders here" sub={filter!=='ALL'?`No ${filter.toLowerCase()} orders.`:"You haven't received any orders yet."}/>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {visible.map(tx=>(
            <div key={tx.id} onClick={()=>setDetail(tx)}
              style={{padding:'14px 18px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold-border)';e.currentTarget.style.background='var(--surface2)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface)';}}>

              <div style={{width:10,height:10,borderRadius:'50%',flexShrink:0,background:tx.status==='COMPLETED'?'var(--green)':tx.status==='DISPUTED'?'var(--red)':tx.status==='FUNDED'?'var(--gold)':tx.status==='DELIVERED'?'var(--blue)':'var(--text3)'}}/>

              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{tx.title}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{tx.buyer?.full_name} · {fmtShort(tx.created_at)}</div>
              </div>

              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,color:'var(--gold-light)'}}>{fmt(tx.amount)}</div>
                <div style={{fontSize:10,color:'var(--text3)'}}>you get {fmt(tx.seller_receives)}</div>
              </div>

              <Badge status={tx.status}/>

              {tx.status==='FUNDED'&&(
                <Btn size="sm" variant="success" onClick={e=>{e.stopPropagation();setDeliver(tx);}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Deliver
                </Btn>
              )}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      )}

      {detail&&<OrderDrawer tx={detail} currentUserId={user?.id} onClose={()=>setDetail(null)} onDeliver={tx=>{setDeliver(tx);}} />}

      <Modal open={!!deliver} onClose={()=>setDeliver(null)} title="Mark as Delivered">
        {deliver&&<DeliverModal tx={deliver} onDelivered={handleDelivered} onClose={()=>setDeliver(null)}/>}
      </Modal>
    </div>
  );
}