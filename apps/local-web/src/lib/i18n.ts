import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import en from '@delivez/i18n/locales/en.json';
import { apiUrl } from './config';
import LANGUAGE_LIST from '@delivez/i18n/languages.json';
import { api } from './api';
import { useAuth } from './auth-store';

export type MsgKey = keyof typeof en;
export type LanguageCode = 'EN' | 'HI' | 'KN' | 'TA' | 'TE' | 'ML' | 'MR' | 'BN';
export const LANGUAGES = LANGUAGE_LIST as { code: LanguageCode; locale: string; label: string; english: string }[];

interface Bundle {
  code: LanguageCode;
  locale: string;
  version: string;
  coverage: number;
  messages: Partial<Record<MsgKey, string>>;
}

/** English ships with the app; other languages come from GET /v1/i18n/:code and are cached for the session. */
function useBundle(lang: string) {
  return useQuery({
    queryKey: ['i18n', lang],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/v1/i18n/${lang}`));
      if (!res.ok) throw new Error(`i18n ${lang}: ${res.status}`);
      return (await res.json()) as Bundle;
    },
    enabled: lang !== 'EN',
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s);

/**
 * `t('nav.login')` → text in the chosen language, falling back to English per key
 * (so a half-translated language never shows raw keys).
 */
export function useI18n() {
  const lang = useAuth((s) => s.language) as LanguageCode;
  const token = useAuth((s) => s.accessToken);
  const { data } = useBundle(lang);
  const info = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = info.locale;
  }, [info.locale]);

  const t = useCallback(
    (key: MsgKey, vars?: Record<string, string | number>) => fill((lang !== 'EN' && data?.messages[key]) || en[key] || key, vars),
    [lang, data],
  );

  /** Switch language now; when signed in, also save it to the account (PUT /v1/me/language). */
  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      useAuth.getState().setLanguage(code);
      if (token) await api('/me/language', { method: 'PUT', body: { language: code } }).catch(() => undefined);
    },
    [token],
  );

  return { t, lang, locale: info.locale, setLanguage, languages: LANGUAGES, loading: lang !== 'EN' && !data };
}

/**
 * After login: a language picked before signing in wins (and is saved to the account);
 * otherwise the account's saved language is applied on this device.
 */
export async function syncLanguageAfterLogin(serverLanguage: string | undefined) {
  const local = useAuth.getState().language;
  if (!serverLanguage || local === serverLanguage) return;
  if (local !== 'EN') await api('/me/language', { method: 'PUT', body: { language: local } }).catch(() => undefined);
  else useAuth.getState().setLanguage(serverLanguage);
}
