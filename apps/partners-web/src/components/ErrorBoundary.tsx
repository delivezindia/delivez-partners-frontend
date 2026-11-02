import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Button } from './ui';
import { useI18n } from '../lib/i18n';

/** After a deploy, an open tab can ask for page files that no longer exist: one automatic reload fetches the new ones. */
const STALE_CHUNK = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;
const RELOADED_AT = 'dz-chunk-reload';

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
    if (!STALE_CHUNK.test(error.message)) return;
    try {
      const last = Number(sessionStorage.getItem(RELOADED_AT) ?? 0);
      if (Date.now() - last < 60_000) return; // reloaded a moment ago: show the screen instead of looping
      sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    } catch {
      return;
    }
    location.reload();
  }

  render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}

// A crash inside a screen shows a way out instead of a blank page; opening another page clears it.
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}

function CrashScreen() {
  const { t } = useI18n();
  return (
    <div role="alert" className="grid min-h-[70vh] place-items-center bg-soft px-6 text-center" data-crash>
      <div className="max-w-sm">
        <TriangleAlert className="mx-auto h-10 w-10 text-dz-red" aria-hidden />
        <h1 className="mt-3 text-3xl">{t('err.title')}</h1>
        <p className="mt-2 text-ink-2">{t('err.body')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => location.reload()}>{t('err.reload')}</Button>
          <Button variant="ghost" onClick={() => location.assign('/')}>
            {t('err.home')}
          </Button>
        </div>
      </div>
    </div>
  );
}
