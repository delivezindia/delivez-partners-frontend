import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './lib/auth-store';
import { CartBar } from './components/CartBar';
import Home from './screens/Home';
import Store from './screens/Store';
import Login from './screens/Login';
import Account from './screens/Account';
import AddressEditor from './screens/AddressEditor';
import Cart from './screens/Cart';
import Orders from './screens/Orders';
import OrderStatus from './screens/OrderStatus';
import { useAdoptSavedAddress } from './lib/location';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuth((s) => s.accessToken);
  const { pathname, search } = useLocation();
  return token ? children : <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}

function SavedAddress() {
  useAdoptSavedAddress();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SavedAddress />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/s/:slug" element={<Store />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/addresses/new" element={<AddressEditor />} />
          <Route path="/addresses/:id/edit" element={<RequireAuth><AddressEditor /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderStatus /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CartBar />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
