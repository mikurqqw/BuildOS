import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>BuildOS</h1>
        <p>
          Не удалось открыть пространство / Кеңістік ашылмады / Could not open
          workspace
        </p>
        <button
          className="button primary"
          onClick={() => location.reload()}
          aria-label="Перезагрузить / Қайта жүктеу / Reload"
        >
          ↻
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
