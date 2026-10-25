import { useRef } from 'react';

/**
 * Address fields that follow the map pin. Every time the pin moves, each field is refilled from the map
 * — unless the partner has typed their own text into it since the last fill (then it is left alone).
 * Empty fields are always filled.
 */
export function useAddressAutofill<K extends string>(initial: Partial<Record<K, string>> = {}) {
  // What the map last put in each field; a field still equal to it hasn't been edited by hand.
  const last = useRef<Partial<Record<K, string>>>({ ...initial });
  return function merge<T extends Record<K, string>>(current: T, fromMap: Partial<Record<K, string | null | undefined>>): T {
    const next = { ...current };
    for (const key of Object.keys(fromMap) as K[]) {
      const value = fromMap[key]?.trim();
      if (!value) continue;
      const mine = current[key] ?? '';
      if (!mine.trim() || mine === last.current[key]) {
        (next as Record<K, string>)[key] = value;
        last.current[key] = value;
      }
    }
    return next;
  };
}
