import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  authSessionSchema,
  authStatusSchema,
  type AuthUser,
} from '@buildos/shared';
import { api, ApiError } from '../data/api';
import type { DemoMode } from '../data/demo';
type Session = { user: AuthUser; csrfToken: string };
type AuthResult = {
  session: Session | null;
  setupRequired: boolean;
  requiresSetupToken: boolean;
};
type AuthState = AuthResult & {
  demoAccess: boolean;
  demoMode: DemoMode | null;
  demoOnly: boolean;
  startDemo: (mode: DemoMode) => void;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  submit: (
    operation: 'setup' | 'login' | 'accept',
    body: unknown,
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<AuthState | null>(null);
const queryKey = ['auth-session'] as const;
const signedOut: AuthResult = {
  session: null,
  setupRequired: false,
  requiresSetupToken: false,
};
async function fetchAuth(): Promise<AuthResult> {
  try {
    return {
      session: await api('/auth/session', authSessionSchema),
      setupRequired: false,
      requiresSetupToken: false,
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const status = await api('/auth/status', authStatusSchema);
    return { session: null, ...status };
  }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState<DemoMode | null>(null);
  const demoAccess = demoMode !== null;
  const demoOnly = import.meta.env.VITE_DEMO_ONLY === 'true';
  const client = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: fetchAuth,
    enabled: !demoAccess && !demoOnly,
    retry: false,
    staleTime: 30000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const state = query.data ?? signedOut;
  useEffect(() => {
    const expired = () => {
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth-session',
      });
      client.setQueryData(queryKey, signedOut);
    };
    window.addEventListener('buildos-auth-expired', expired);
    return () => window.removeEventListener('buildos-auth-expired', expired);
  }, [client]);
  async function submit(
    operation: 'setup' | 'login' | 'accept',
    body: unknown,
  ) {
    const session = await api(`/auth/${operation}`, authSessionSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    client.setQueryData(queryKey, { ...signedOut, session });
    if (operation === 'accept') {
      const url = new URL(location.href);
      url.searchParams.delete('invite');
      history.replaceState(null, '', url.pathname + url.search);
    }
  }
  async function logout() {
    if (demoAccess) {
      setDemoMode(null);
      return;
    }
    if (!state.session) return;
    await api('/auth/logout', z.object({ ok: z.boolean() }), {
      method: 'POST',
      headers: { 'X-CSRF-Token': state.session.csrfToken },
    });
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'auth-session',
    });
    client.setQueryData(queryKey, signedOut);
  }
  return (
    <Context.Provider
      value={{
        ...state,
        demoAccess,
        demoMode,
        demoOnly,
        startDemo: (mode) => {
          void client.cancelQueries({ queryKey });
          setDemoMode(mode);
        },
        loading:
          !demoOnly &&
          !demoAccess &&
          (query.isPending || (!state.session && query.isFetching)),
        error: query.isError ? 'SERVER_UNAVAILABLE' : '',
        refresh: async () => {
          await query.refetch();
        },
        submit,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('Auth provider missing');
  return value;
}
