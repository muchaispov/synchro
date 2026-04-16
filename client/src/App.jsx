import { useAuth }    from './context/AuthContext';
import { Spinner }    from './components/UI';
import AccessGate     from './components/AccessGate';
import LandingPage    from './pages/landing/LandingPage';
import SellerAuth     from './pages/seller/SellerAuth';
import SellerApp      from './pages/seller/SellerApp';
import PaymentPage    from './pages/buyer/PaymentPage';
import TrackPage      from './pages/buyer/TrackPage';
import AdminApp       from './pages/admin/AdminApp';
import AcceptInvite   from './pages/admin/AcceptInvite';

export default function App() {
  const { user, loading } = useAuth();
  const path = window.location.pathname;

  // ── Public routes — no gate ──────────────────────────────────────────────
  if (path === '/') return <LandingPage />;

  // ── Gated routes — require access code ──────────────────────────────────
  if (path.startsWith('/pay/'))                return <AccessGate><PaymentPage /></AccessGate>;
  if (path.startsWith('/track/'))              return <AccessGate><TrackPage /></AccessGate>;
  if (path.startsWith('/admin/accept-invite')) return <AcceptInvite />;
  if (path.startsWith('/admin'))               return <AccessGate><AdminApp /></AccessGate>;

  // ── Seller portal ────────────────────────────────────────────────────────
  return (
    <AccessGate>
      {loading ? (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
          <div style={{ animation:'goldPulse 2s ease infinite' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="11" fill="rgba(201,168,76,.08)" stroke="rgba(201,168,76,.2)" strokeWidth="1"/>
              <path d="M12 20 C12 14.5 15.8 11 20 11 C24.2 11 28 14.5 28 20" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M28 20 C28 25.5 24.2 29 20 29 C15.8 29 12 25.5 12 20" stroke="#a8863a" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="20" cy="20" r="3" fill="#c9a84c"/>
            </svg>
          </div>
          <Spinner size={18} color="var(--gold)" />
        </div>
      ) : !user || user.role !== 'seller' ? (
        <SellerAuth />
      ) : (
        <SellerApp />
      )}
    </AccessGate>
  );
}