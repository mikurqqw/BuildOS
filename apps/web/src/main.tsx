import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles.css';
import './upgrade.css';
import { App } from './App';
import { I18nProvider } from './i18n/context';
import { WorkspaceProvider } from './data/workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './auth/context';
import { AuthGate } from './auth/Gate';
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <I18nProvider>
            <AuthProvider>
              <AuthGate>
                <WorkspaceProvider>
                  <App />
                </WorkspaceProvider>
              </AuthGate>
            </AuthProvider>
          </I18nProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
