import { Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './lib/auth-store';
import { CartBar } from './components/CartBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import Login, { safeNext } from './screens/Login';
import { lazyPage, preloadPages } from './lib/lazyPage';
import { useAdoptSavedAddress } from './lib/location';
import { usePushBridge } from './lib/push';

// Each screen is its own download, fetched when first opened (the rest are preloaded once the first page is up).
const Landing = lazyPage(() => import('./screens/Landing'));
const Home = lazyPage(() => import('./screens/Home'));
const Store = lazyPage(() => import('./screens/Store'));
const Account = lazyPage(() => import('./screens/Account'));
const AddressEditor = lazyPage(() => import('./screens/AddressEditor'));
const Cart = lazyPage(() => import('./screens/Cart'));
const Orders = lazyPage(() => import('./screens/Orders'));
const OrderStatus = lazyPage(() => import('./screens/OrderStatus'));
const Policy = lazyPage(() => import('./screens/Policy'));
const LabBook = lazyPage(() => import('./screens/LabBook'));
const Booking = lazyPage(() => import('./screens/Booking'));
const HelpList = lazyPage(() => import('./screens/Help').then((m) => ({ default: m.HelpList })));
const HelpNew = lazyPage(() => import('./screens/Help').then((m) => ({ default: m.HelpNew })));
const HelpTicket = lazyPage(() => import('./screens/Help').then((m) => ({ default: m.HelpTicket })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const { pathname, search } = useLocation();
  return token ? children : <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}

/** Already signed in: /login and /signup go straight on. */
function GuestOnly({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const [params] = useSearchParams();
  return token ? <Navigate to={safeNext(params.get('next'))} replace /> : children;
}

function SavedAddress() {
  useAdoptSavedAddress();
  usePushBridge();
  return null;
}

function PageLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-dz-red" />
    </div>
  );
}

export default function App() {
  useEffect(preloadPages, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SavedAddress />
        <ErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/shops" element={<Home />} />
              <Route path="/s/:slug" element={<Store />} />
              <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/signup" element={<GuestOnly><Login /></GuestOnly>} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/addresses/new" element={<AddressEditor />} />
              <Route path="/addresses/:id/edit" element={<RequireAuth><AddressEditor /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
              <Route path="/orders/:id" element={<RequireAuth><OrderStatus /></RequireAuth>} />
              <Route path="/book-lab" element={<RequireAuth><LabBook /></RequireAuth>} />
              <Route path="/bookings/:id" element={<RequireAuth><Booking /></RequireAuth>} />
              <Route path="/help" element={<RequireAuth><HelpList /></RequireAuth>} />
              <Route path="/help/new" element={<RequireAuth><HelpNew /></RequireAuth>} />
              <Route path="/help/:id" element={<RequireAuth><HelpTicket /></RequireAuth>} />
              <Route path="/refund-policy" element={<Policy />} />
              <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <CartBar />
        </ErrorBoundary>
        <OfflineBanner />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
