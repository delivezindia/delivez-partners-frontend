import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './lib/api';
import Login from './screens/Login';
import Layout from './screens/Layout';
import Pipeline from './screens/Pipeline';
import Dashboard from './screens/Dashboard';
import Team from './screens/Team';
import Cities from './screens/Cities';
import Legal from './screens/Legal';
import Audit from './screens/Audit';
import DevMessages from './screens/DevMessages';
import System from './screens/System';
import Orders from './screens/Orders';
import Support from './screens/Support';
import Reports from './screens/Reports';
import Documents from './screens/Documents';
import StoreReview from './screens/StoreReview';
import AmShell from './screens/am/AmShell';
import AmHome from './screens/am/AmHome';
import AmStores from './screens/am/AmStores';
import AmStore from './screens/am/AmStore';
import AmAlerts from './screens/am/AmAlerts';
import AmTasks from './screens/am/AmTasks';
import AmProfile from './screens/am/AmProfile';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

function RequireAuth({ children }: { children: ReactNode }) {
  return useAuth((s) => s.accessToken) ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stores" element={<Pipeline />} />
            <Route path="/team" element={<Team />} />
            <Route path="/cities" element={<Cities />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/system" element={<System />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/support" element={<Support />} />
            <Route path="/reports" element={<Reports />} />
            {import.meta.env.DEV && <Route path="/dev/messages" element={<DevMessages />} />}
            <Route path="/documents" element={<Documents />} />
            <Route path="/stores/:storeId" element={<StoreReview />} />
          </Route>
          {/* Account manager mobile view */}
          <Route element={<RequireAuth><AmShell /></RequireAuth>}>
            <Route path="/am" element={<AmHome />} />
            <Route path="/am/stores" element={<AmStores />} />
            <Route path="/am/stores/:storeId" element={<AmStore />} />
            <Route path="/am/alerts" element={<AmAlerts />} />
            <Route path="/am/tasks" element={<AmTasks />} />
            <Route path="/am/profile" element={<AmProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
