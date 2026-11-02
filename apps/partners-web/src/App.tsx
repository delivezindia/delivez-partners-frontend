import { Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './lib/auth-store';
import { lazyPage, preloadPages } from './lib/lazyPage';
import Login, { safeNext } from './screens/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBar } from './components/OfflineBar';
import { PageLoading } from './components/PageLoading';
import { PublicLayout } from './site/PublicLayout';

// Each screen is its own download, fetched when first opened (the rest are preloaded once the first page is up),
// so a visitor to the public site doesn't download the whole shop app.
const Accounts = lazyPage(() => import('./screens/Accounts'));
const StoreLayout = lazyPage(() => import('./screens/store/StoreLayout'));
const Dashboard = lazyPage(() => import('./screens/store/Dashboard'));
const Settings = lazyPage(() => import('./screens/store/Settings'));
const Staff = lazyPage(() => import('./screens/store/Staff'));
const SwitchUser = lazyPage(() => import('./screens/store/SwitchUser'));
const Orders = lazyPage(() => import('./screens/store/Orders'));
const OrderDetail = lazyPage(() => import('./screens/store/OrderDetail'));
const Notifications = lazyPage(() => import('./screens/store/Notifications'));
const Menu = lazyPage(() => import('./screens/store/Menu'));
const Bookings = lazyPage(() => import('./screens/store/Bookings'));
const Prescriptions = lazyPage(() => import('./screens/store/Prescriptions'));
const Help = lazyPage(() => import('./screens/store/Help'));
const Import = lazyPage(() => import('./screens/store/Import'));
const Inventory = lazyPage(() => import('./screens/store/Inventory'));
const Reviews = lazyPage(() => import('./screens/store/Reviews'));
const StartOnboarding = lazyPage(() => import('./screens/onboarding/StartOnboarding'));
const OnboardingWizard = lazyPage(() => import('./screens/onboarding/OnboardingWizard'));
const Home = lazyPage(() => import('./site/pages/Home'));
const ServicePage = lazyPage(() => import('./site/pages/ServicePage'));
const HowItWorks = lazyPage(() => import('./site/pages/InfoPages').then((m) => ({ default: m.HowItWorks })));
const Pricing = lazyPage(() => import('./site/pages/InfoPages').then((m) => ({ default: m.Pricing })));
const Faq = lazyPage(() => import('./site/pages/InfoPages').then((m) => ({ default: m.Faq })));
const Contact = lazyPage(() => import('./site/pages/InfoPages').then((m) => ({ default: m.Contact })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const { pathname, search } = useLocation();
  return token ? children : <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const [params] = useSearchParams();
  const loggingOut = (useLocation().state as { loggedOut?: boolean } | null)?.loggedOut;
  return token && !loggingOut ? <Navigate to={safeNext(params.get('next'))} replace /> : children;
}

export default function App() {
  useEffect(preloadPages, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OfflineBar />
        <ErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public site — shared navbar + footer */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services/:slug" element={<ServicePage />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/contact" element={<Contact />} />
              </Route>
              <Route element={<PublicLayout footer={false} />}>
                <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
              </Route>

              {/* Partner app */}
              <Route path="/accounts" element={<RequireAuth><Accounts /></RequireAuth>} />
              <Route path="/stores/:storeId" element={<RequireAuth><StoreLayout /></RequireAuth>}>
                <Route index element={<Dashboard />} />
                <Route path="settings" element={<Settings />} />
                <Route path="staff" element={<Staff />} />
                <Route path="switch" element={<SwitchUser />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:orderNo" element={<OrderDetail />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="menu" element={<Menu />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="prescriptions" element={<Prescriptions />} />
                <Route path="help" element={<Help />} />
                <Route path="menu/import" element={<Import />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="reviews" element={<Reviews />} />
              </Route>
              <Route path="/onboarding/new" element={<RequireAuth><StartOnboarding /></RequireAuth>} />
              <Route path="/onboarding/:storeId" element={<RequireAuth><OnboardingWizard /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
