import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Link } from 'react-router';
import type { Project, WorkspaceCollection } from '@buildos/shared';
import { Shell } from './components/Shell';
import type { FormKind } from './components/RecordForm';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { useWorkspace } from './data/workspace';
import { useI18n } from './i18n/context';
import { Empty } from './components/ui';
const Budget = lazy(() => import('./pages/Budget'));
const RecordForm = lazy(() =>
  import('./components/RecordForm').then((module) => ({
    default: module.RecordForm,
  })),
);
const ProjectDetail = lazy(() =>
  import('./pages/ProjectDetail').then((module) => ({
    default: module.ProjectDetail,
  })),
);
const Tasks = lazy(() =>
  import('./pages/Tasks').then((module) => ({ default: module.Tasks })),
);
const Issues = lazy(() =>
  import('./pages/Issues').then((module) => ({ default: module.Issues })),
);
const Documents = lazy(() =>
  import('./pages/Documents').then((module) => ({ default: module.Documents })),
);
const Procurement = lazy(() =>
  import('./pages/Procurement').then((module) => ({
    default: module.Procurement,
  })),
);
const Finance = lazy(() =>
  import('./pages/Finance').then((module) => ({ default: module.Finance })),
);
const Reports = lazy(() =>
  import('./pages/Reports').then((module) => ({ default: module.Reports })),
);
const Audit = lazy(() =>
  import('./pages/Audit').then((module) => ({ default: module.Audit })),
);
const Schedule = lazy(() =>
  import('./pages/Schedule').then((module) => ({ default: module.Schedule })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);
const Team = lazy(() =>
  import('./pages/Team').then((module) => ({ default: module.Team })),
);
export function App() {
  const { data, notify, canWrite } = useWorkspace();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{
    kind: FormKind;
    projectId?: string;
    editing?: Project;
  } | null>(null);
  function open(kind: FormKind, projectId?: string, editing?: Project) {
    const collections: Record<FormKind, WorkspaceCollection> = {
      project: 'projects',
      task: 'tasks',
      issue: 'issues',
      budget: 'budgetLines',
      member: 'members',
      request: 'requests',
    };
    if (!canWrite(collections[kind])) {
      notify(t.operationForbidden);
      return;
    }
    if (!['project', 'member'].includes(kind) && !data.projects.length) {
      notify(t.noProject);
      if (canWrite('projects')) setForm({ kind: 'project' });
      return;
    }
    setForm({ kind, projectId, editing });
  }
  return (
    <Shell
      search={search}
      setSearch={setSearch}
      onCreate={() => open('project')}
    >
      <Suspense
        fallback={
          <div className="loading-skeleton" aria-label={t.workspace}>
            <span />
            <span />
            <span />
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={<Dashboard createProject={() => open('project')} />}
          />
          <Route
            path="/projects"
            element={
              <Projects search={search} onCreate={() => open('project')} />
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProjectDetail
                onEdit={(project) => open('project', undefined, project)}
                onTask={(id) => open('task', id)}
              />
            }
          />
          <Route
            path="/tasks"
            element={<Tasks search={search} onCreate={() => open('task')} />}
          />
          <Route
            path="/issues"
            element={<Issues search={search} onCreate={() => open('issue')} />}
          />
          <Route path="/documents" element={<Documents search={search} />} />
          <Route
            path="/budget"
            element={<Budget search={search} onCreate={() => open('budget')} />}
          />
          <Route path="/schedule" element={<Schedule />} />
          <Route
            path="/procurement"
            element={
              <Procurement search={search} onCreate={() => open('request')} />
            }
          />
          <Route path="/finance" element={<Finance search={search} />} />
          <Route path="/reports" element={<Reports search={search} />} />
          <Route path="/audit" element={<Audit search={search} />} />
          <Route path="/team" element={<Team search={search} />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <Empty
                title="404"
                action={
                  <Link className="button primary" to="/">
                    {t.overview}
                  </Link>
                }
              />
            }
          />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        {form && (
          <RecordForm
            kind={form.kind}
            projectId={form.projectId}
            editing={form.editing}
            onClose={() => setForm(null)}
          />
        )}
      </Suspense>
    </Shell>
  );
}
