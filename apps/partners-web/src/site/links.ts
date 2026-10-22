import { useAuth } from '../lib/auth-store';

/** "Register" goes straight to the wizard when logged in, otherwise via login and back. */
export function useRegisterHref() {
  const token = useAuth((s) => s.accessToken);
  return token ? '/onboarding/new' : `/login?next=${encodeURIComponent('/onboarding/new')}`;
}
