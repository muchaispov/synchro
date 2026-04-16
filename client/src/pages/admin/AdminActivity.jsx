import { useState, useEffect } from 'react';
import { adminTeamAPI } from '../../services/api';
import { useToast }     from '../../components/Toast';
import { Card, Btn, Skeleton, Empty } from '../../components/UI';

function fmtDate(d) { return new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }

const ACTION_CONFIG = {
  dispute_release:  { icon:'✅', color:'var(--green)',  label:'Dispute Released' },
  dispute_refund:   { icon:'↩️', color:'#c084fc',      label:'Dispute Refunded' },
  payout_approve:   { icon:'💸', color:'var(--gold)',   label:'Payout Approved' },
  payout_reject:    { icon:'✗',  color:'var(--red)',    label:'Payout Rejected' },
  user_ban:         { icon:'🚫', color:'var(--red)',    label:'User Banned' },
  user_unban:       { icon:'✓',  color:'var(--green)',  label:'User Unbanned' },
  kyc_verify:       { icon:'🪪', color:'var(--blue)',   label:'KYC Verified' },
  settings_update:  { icon:'⚙️', color:'var(--text2)', label:'Settings Updated' },
  admin_invite:     { icon:'✉️', color:'var(--gold)',   label:'Admin Invited' },
  admin_joined:     { icon:'👤', color:'var(--green)',  label:'Admin Joined' },
  admin_remove:     { icon:'🗑', color:'var(--red)',    label:'Admin Removed' },
};

export default function AdminActivity() {
  const { toast }  = useToast();
  const [data,     setData]    = useState({ logs:[], total:0, page:1, pages:1 });
  const [loading,  setLoading] = useState(true);
  const [page,     setPage]    = useState(1);

  useEffect(() => {
    setLoading(true);
    adminTeamAPI.activity({ page })
      .then(setData)
      .catch(e => toast(e.message,'error'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div style={{ animation:'fadeIn .4s ease' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:500, marginBottom:6 }}>Activity Log</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>Full audit trail of all admin actions.</p>
      </div>

      <Card>
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--text3)' }}>{data.total} total actions</span>
          <span style={{ fontSize:12, color:'var(--text3)' }}>Page {data.page} of {data.pages}</span>
        </div>

        {loading ? (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
            {Array(10).fill(0).map((_,i) => <Skeleton key={i} h={52} style={{ borderRadius:8 }} />)}
          </div>
        ) : data.logs.length === 0 ? (
          <Empty icon="📋" title="No activity yet" sub="Admin actions will appear here." />
        ) : data.logs.map((log, i) => {
          const cfg = ACTION_CONFIG[log.action] || { icon:'•', color:'var(--text3)', label: log.action };
          return (
            <div key={log.id} style={{ padding:'12px 20px', display:'flex', alignItems:'flex-start', gap:14, borderBottom:'1px solid var(--border)', transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>

              {/* Icon */}
              <div style={{ width:32, height:32, borderRadius:8, background:`rgba(0,0,0,.3)`, border:`1px solid ${cfg.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>by</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{log.admin?.full_name}</span>
                </div>
                {log.detail && (
                  <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.detail}</div>
                )}
              </div>

              {/* Time */}
              <div style={{ fontSize:10, color:'var(--text3)', flexShrink:0, textAlign:'right', marginTop:2 }}>{fmtDate(log.created_at)}</div>
            </div>
          );
        })}

        {/* Pagination */}
        {data.pages > 1 && (
          <div style={{ padding:'14px 20px', display:'flex', gap:8, justifyContent:'center', borderTop:'1px solid var(--border)' }}>
            <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p-1)}>← Prev</Btn>
            <Btn size="sm" variant="ghost" disabled={page >= data.pages} onClick={() => setPage(p => p+1)}>Next →</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}