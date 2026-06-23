import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ACTIVE_STORAGE_KEY, getBrowserStorage, removeStoredProject } from '../../state/projectStorage';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('StudioWire IO recovered from an application error.', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary" role="alert">
        <h1>StudioWire IO could not render this project view.</h1>
        <p>{this.state.error.message}</p>
        <div>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset local StudioWire IO autosave data? Export first if you need a copy.')) {
                const storage = getBrowserStorage();

                if (storage.ok) {
                  removeStoredProject(storage.storage, ACTIVE_STORAGE_KEY);
                }
                window.location.reload();
              }
            }}
          >
            Reset Autosave
          </button>
        </div>
      </main>
    );
  }
}
