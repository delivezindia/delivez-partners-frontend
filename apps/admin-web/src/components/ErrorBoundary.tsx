import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Button } from './ui';

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; message: string }> {
  state = { failed: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { failed: true, message: error.message };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false, message: '' });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="grid min-h-[60vh] place-items-center px-6 text-center" data-crash>
        <div className="max-w-md">
          <TriangleAlert className="mx-auto h-10 w-10 text-dz-red" aria-hidden />
          <h1 className="mt-3 text-3xl">Something went wrong</h1>
          <p className="mt-2 text-ink-2">This screen hit a problem. Reloading usually fixes it; if it keeps happening, send the message below to the developers.</p>
          {this.state.message && <p className="mt-3 break-words rounded-lg bg-soft px-3 py-2 font-mono text-xs text-ink-2">{this.state.message}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => location.reload()}>Reload</Button>
            <Button variant="outline" onClick={() => location.assign('/')}>
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

// Staff tool: a crash inside a screen shows the error and a way out instead of a blank page; opening another page clears it.
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
