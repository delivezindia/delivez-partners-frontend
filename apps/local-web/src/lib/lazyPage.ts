import { lazy, type ComponentType } from 'react';

const loaders: (() => Promise<unknown>)[] = [];

/** A screen whose code downloads the first time it's opened (keeps the first load small). */
export function lazyPage<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  loaders.push(load);
  return lazy(load);
}

/** Once the first page is up, fetch the other screens while the browser is idle, so later taps don't wait. */
export function preloadPages() {
  const run = () => loaders.forEach((load) => void load().catch(() => undefined));
  const idle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(run, { timeout: 5000 }) : setTimeout(run, 2000));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}
