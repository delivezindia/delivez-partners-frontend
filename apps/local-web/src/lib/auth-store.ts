import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SessionUser {
  id: string;
  phone: string;
  fullName: string | null;
  language?: string;
  isNew?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  language: string;
  setSession: (s: { accessToken: string; refreshToken: string; user?: SessionUser }) => void;
  setLanguage: (language: string) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      language: 'EN',
      setSession: ({ accessToken, refreshToken, user }) =>
        set((s) => ({ accessToken, refreshToken, user: user ?? s.user })),
      setLanguage: (language) => set({ language }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'dz-local-auth', storage: createJSONStorage(() => localStorage) },
  ),
);
