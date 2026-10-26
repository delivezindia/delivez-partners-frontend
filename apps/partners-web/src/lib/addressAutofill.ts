import { useRef } from 'react';

/**
 * Fields filled from a source (the map pin, a scanned cheque). Every new reading refills each field —
 * unless the person has typed their own text into it (then it is left alone). Empty fields are always filled.
 *
 * A field counts as untouched while it holds a value we put there ourselves. Remembering every value we
 * wrote (not just the last) keeps this correct when React runs a state updater twice (StrictMode).
 */
export function useAddressAutofill<K extends string>(initial: Partial<Record<K, string>> = {}) {
  const written = useRef<Map<K, Set<string>> | null>(null);
  if (!written.current) {
    written.current = new Map();
    for (const [k, v] of Object.entries(initial) as [K, string | undefined][]) if (v) written.current.set(k, new Set([v]));
  }
  return function merge<T extends Record<K, string>>(current: T, fromSource: Partial<Record<K, string | null | undefined>>): T {
    const next = { ...current };
    for (const key of Object.keys(fromSource) as K[]) {
      const value = fromSource[key]?.trim();
      if (!value) continue;
      const mine = current[key] ?? '';
      const ours = written.current!.get(key) ?? new Set<string>();
      if (!mine.trim() || ours.has(mine)) {
        (next as Record<K, string>)[key] = value;
        ours.add(value);
        written.current!.set(key, ours);
      }
    }
    return next;
  };
}
