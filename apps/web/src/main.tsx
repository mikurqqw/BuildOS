import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles.css';
import './upgrade.css';
import './refinements.css';
import './procurement-operations.css';
import './documents-finance.css';
import { App } from './App';
import { I18nProvider } from './i18n/context';
import { WorkspaceProvider } from './data/workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './auth/context';
import { AuthGate } from './auth/Gate';
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
// Static hosts without SPA rewrites must keep routes in the URL fragment.
const Router =
  import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;
function Workspace() {
  const { demoMode, session } = useAuth();
  return (
    <WorkspaceProvider key={demoMode ?? session?.user.id ?? 'signed-out'}>
      <App />
    </WorkspaceProvider>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <Router>
          <I18nProvider>
            <AuthProvider>
              <AuthGate>
                <Workspace />
              </AuthGate>
            </AuthProvider>
          </I18nProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
