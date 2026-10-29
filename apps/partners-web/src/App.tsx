import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './lib/auth-store';
import Login, { safeNext } from './screens/Login';
import Accounts from './screens/Accounts';
import StoreLayout from './screens/store/StoreLayout';
import Dashboard from './screens/store/Dashboard';
import Settings from './screens/store/Settings';
import Staff from './screens/store/Staff';
import SwitchUser from './screens/store/SwitchUser';
import Orders from './screens/store/Orders';
import OrderDetail from './screens/store/OrderDetail';
import Notifications from './screens/store/Notifications';
import { OfflineBar } from './components/OfflineBar';
import Menu from './screens/store/Menu';
import Bookings from './screens/store/Bookings';
import Prescriptions from './screens/store/Prescriptions';
import Help from './screens/store/Help';
import Import from './screens/store/Import';
import Inventory from './screens/store/Inventory';
import Reviews from './screens/store/Reviews';
import StartOnboarding from './screens/onboarding/StartOnboarding';
import OnboardingWizard from './screens/onboarding/OnboardingWizard';
import { PublicLayout } from './site/PublicLayout';
import Home from './site/pages/Home';
import ServicePage from './site/pages/ServicePage';
import { Contact, Faq, HowItWorks, Pricing } from './site/pages/InfoPages';

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OfflineBar />
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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
