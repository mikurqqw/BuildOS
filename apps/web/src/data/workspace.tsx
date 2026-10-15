import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import {
  emptyWorkspace,
  workspaceSchema,
  workspaceResponseSchema,
  applyChange,
  createScopeGuard,
  type Workspace,
  type AccessActor,
  type WorkspaceCollection,
  demoActor,
  canWrite as hasWrite,
  mergeWorkspace,
  validateWorkspaceChange,
} from '@buildos/shared';
import { createDemo } from './demo';
import { localizeDemo } from './demo-copy';
import { useI18n } from '../i18n/context';
import { useAuth } from '../auth/context';
import { api, ApiError } from './api';
import { operationError } from '../i18n/operations-errors';
type ActivityKind = Workspace['activity'][number]['kind'];
type ContextValue = {
  actor: AccessActor;
  canWrite: (collection: WorkspaceCollection) => boolean;
  data: Workspace;
  demo: boolean;
  update: (
    change: (draft: Workspace) => void,
    kind: ActivityKind,
    title: string,
  ) => Promise<boolean>;
  setDemo: (value: boolean) => Promise<void>;
  restore: (value: unknown) => Promise<boolean>;
  notify: (message: string) => void;
  storageBlocked: boolean;
  pending: boolean;
};
const Context = createContext<ContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const { session, logout, demoAccess, demoMode, startDemo } = useAuth();
  const [data, setData] = useState(() =>
    demoAccess ? createDemo(demoMode ?? 'full') : emptyWorkspace(),
  );
  const [demo, setDemoState] = useState(demoAccess);
  const actor: AccessActor = demo
    ? demoActor
    : (session?.user ?? {
        id: 'signed-out',
        role: 'VIEWER',
        allProjects: false,
        projectIds: [],
      });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!demoAccess);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [scope, setScope] = useState(0);
  const current = useRef({ data, version: 0 });
  const activeDemo = useRef(demoAccess);
  const guard = useRef(createScopeGuard());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  async function load() {
    try {
      const result = await api('/workspace', workspaceResponseSchema);
      const parsed = workspaceSchema.parse(result.data);
      current.current = { data: parsed, version: result.version };
      setData(parsed);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (demoAccess) return;
    let active = true;
    void api('/workspace', workspaceResponseSchema)
      .then((result) => {
        if (!active) return;
        const parsed = workspaceSchema.parse(result.data);
        current.current = { data: parsed, version: result.version };
        setData(parsed);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demoAccess]);
  function notify(value: string) {
    setMessage(value);
  }
  async function commit(change: (draft: Workspace) => void) {
    const run = async () => {
      if ((!session && !activeDemo.current) || !guard.current.valid(scope)) {
        notify(t.workspaceChanged);
        return false;
      }
      setPending(true);
      try {
        const changed = applyChange(current.current.data, change);
        const next = validateWorkspaceChange(
          current.current.data,
          mergeWorkspace(current.current.data, changed, actor),
          actor,
        );
        if (activeDemo.current) {
          current.current = { ...current.current, data: next };
          setData(next);
          return true;
        }
        if (!session) return false;
        const result = await api('/workspace', workspaceResponseSchema, {
          method: 'PUT',
          headers: {
            'X-CSRF-Token': session.csrfToken,
            'If-Match': `"${current.current.version}"`,
          },
          body: JSON.stringify(next),
        });
        if (!guard.current.valid(scope)) return true;
        const parsed = workspaceSchema.parse(result.data);
        current.current = { data: parsed, version: result.version };
        setData(parsed);
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'WORKSPACE_CONFLICT') {
          setScope(guard.current.invalidate());
          await load();
          notify(t.workspaceChanged);
        } else notify(operationError(error, t) ?? t.storageError);
        return false;
      } finally {
        setPending(false);
      }
    };
    const operation = queue.current.then(run, run);
    queue.current = operation;
    return operation;
  }
  async function update(
    change: (draft: Workspace) => void,
    kind: ActivityKind,
    title: string,
  ) {
    return commit((draft) => {
      change(draft);
      draft.activity.unshift({
        id: crypto.randomUUID(),
        kind,
        title,
        createdAt: new Date().toISOString(),
      });
      draft.activity = draft.activity.slice(0, 200);
    });
  }
  async function setDemo(value: boolean) {
    if (value && demoAccess) {
      startDemo('full');
      return;
    }
    if (!value && demoAccess) {
      await logout();
      return;
    }
    setScope(guard.current.invalidate());
    if (value) {
      activeDemo.current = true;
      const example = createDemo();
      current.current = { ...current.current, data: example };
      setData(example);
      setDemoState(true);
    } else {
      activeDemo.current = false;
      setLoading(true);
      setDemoState(false);
      await load();
    }
  }
  async function restore(value: unknown) {
    if (!guard.current.valid(scope)) {
      notify(t.workspaceChanged);
      return false;
    }
    const parsed = workspaceSchema.safeParse(value);
    if (!parsed.success) {
      notify(t.invalidImport);
      return false;
    }
    const saved = await commit((draft) => {
      Object.assign(draft, parsed.data);
    });
    if (saved) {
      setScope(guard.current.invalidate());
      notify(t.imported);
    }
    return saved;
  }
  if (loading)
    return (
      <div className="workspace-loading">
        <div className="loading-skeleton">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (failed)
    return (
      <div className="workspace-loading">
        <h2>{t.serverUnavailable}</h2>
        <p>{t.serverUnavailableHint}</p>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => {
              setLoading(true);
              setFailed(false);
              void load();
            }}
          >
            {t.retry}
          </button>
          <button className="button" onClick={() => void logout()}>
            {t.signOut}
          </button>
        </div>
      </div>
    );
  return (
    <Context.Provider
      value={{
        data: demo ? localizeDemo(data, locale) : data,
        actor,
        canWrite: (collection) => hasWrite(actor, collection),
        demo,
        update,
        setDemo,
        restore,
        notify,
        storageBlocked: false,
        pending,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button aria-label={t.close} onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace provider missing');
  return value;
}
