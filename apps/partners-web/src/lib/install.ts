import { useEffect, useState } from 'react';

// "Install app" (Add to home screen). Chrome/Edge/Android fire beforeinstallprompt once, possibly before React
// mounts, so it is captured at module load. iPhone has no prompt: users use Share → Add to Home Screen.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own menu item instead of the browser's mini-bar
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** canInstall is true when the browser offers installation and the app isn't installed yet. */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(!!deferred);
  useEffect(() => {
    const update = () => setCanInstall(!!deferred);
    listeners.add(update);
    update();
    return () => void listeners.delete(update);
  }, []);
  const install = async () => {
    if (!deferred) return false;
    const e = deferred;
    await e.prompt();
    const { outcome } = await e.userChoice;
    deferred = null;
    notify();
    return outcome === 'accepted';
  };
  return { canInstall, install };
}
