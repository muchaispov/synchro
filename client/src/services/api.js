const BASE = '/api';
const tok  = () => localStorage.getItem('synchro_token');

async function req(method, path, body, pub = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (!pub && tok()) headers['Authorization'] = `Bearer ${tok()}`;
  const res  = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const authAPI = {
  registerSeller: d  => req('POST', '/auth/register/seller', d, true),
  login:          d  => req('POST', '/auth/login', d, true),
  otpRequest:     d  => req('POST', '/auth/otp/request', d, true),
  otpVerify:      d  => req('POST', '/auth/otp/verify', d, true),
  me:             () => req('GET',  '/auth/me'),
};

export const linksAPI = {
  create:  d       => req('POST',   '/links', d),
  list:    ()      => req('GET',    '/links'),
  update:  (id, d) => req('PATCH',  `/links/${id}`, d),
  delete:  id      => req('DELETE', `/links/${id}`),
  stats:   id      => req('GET',    `/links/${id}/stats`),
  public:  slug    => req('GET',    `/links/public/${slug}`, null, true),
};

export const txAPI = {
  list:     p       => req('GET',  `/transactions?${new URLSearchParams(p)}`),
  mine:     ()      => req('GET',  '/transactions/mine'),
  byRef:    ref     => req('GET',  `/transactions/ref/${ref}`),
  create:   d       => req('POST', '/transactions', d),
  deliver:  (id, d) => req('POST', `/transactions/${id}/deliver`, d),
  confirm:  id      => req('POST', `/transactions/${id}/confirm`),
  dispute:  (id, d) => req('POST', `/transactions/${id}/dispute`, d),
  messages: id      => req('GET',  `/transactions/${id}/messages`),
  sendMsg:  (id, d) => req('POST', `/transactions/${id}/messages`, d),
};

export const payAPI = {
  mpesaInitiate: (txId, d) => req('POST', `/payments/mpesa/initiate/${txId}`, d),
  mpesaQuery:    d         => req('POST', '/payments/mpesa/query', d),
  cardInitiate:  txId      => req('POST', `/payments/card/initiate/${txId}`),
  cardVerify:    ref       => req('GET',  `/payments/card/verify/${ref}`),
};

export const sellerAPI = {
  summary:           ()   => req('GET',    '/seller/summary'),
  bankAccounts:      ()   => req('GET',    '/seller/bank-accounts'),
  addBankAccount:    d    => req('POST',   '/seller/bank-accounts', d),
  deleteBankAccount: id   => req('DELETE', `/seller/bank-accounts/${id}`),
  withdraw:          d    => req('POST',   '/seller/withdraw', d),
  withdrawals:       ()   => req('GET',    '/seller/withdrawals'),
};

export const adminAPI = {
  overview:       ()      => req('GET',  '/admin/overview'),
  transactions:   p       => req('GET',  `/admin/transactions${p?'?'+new URLSearchParams(p):''}`),
  resolveDispute: (id, d) => req('POST', `/admin/disputes/${id}/resolve`, d),
  payouts:        p       => req('GET',  `/admin/payouts${p?'?'+new URLSearchParams(p):''}`),
  approvePayout:  (id, d) => req('POST', `/admin/payouts/${id}/approve`, d),
  rejectPayout:   (id, d) => req('POST', `/admin/payouts/${id}/reject`, d),
  users:          p       => req('GET',  `/admin/users${p?'?'+new URLSearchParams(p):''}`),
  banUser:        id      => req('POST', `/admin/users/${id}/ban`),
  verifyKyc:      (id, d) => req('POST', `/admin/users/${id}/verify-kyc`, d),
  getSettings:    ()      => req('GET',  '/admin/settings'),
  updateSettings: d       => req('POST', '/admin/settings', d),
};

// Admin team management
export const adminTeamAPI = {
  list:          ()      => req('GET',    '/admin/team'),
  invite:        d       => req('POST',   '/admin/team/invite', d),
  remove:        id      => req('DELETE', `/admin/team/${id}`),
  acceptInvite:  d       => req('POST',   '/admin/team/accept-invite', d, true),
  activity:      p       => req('GET',    `/admin/activity${p?'?'+new URLSearchParams(p):''}`),
};