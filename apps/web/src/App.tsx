import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Link } from 'react-router';
import type { Project } from '@buildos/shared';
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
const Registers = lazy(() =>
  import('./pages/Registers').then((module) => ({ default: module.Registers })),
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
  const { data, notify } = useWorkspace();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{
    kind: FormKind;
    projectId?: string;
    editing?: Project;
  } | null>(null);
  function open(kind: FormKind, projectId?: string, editing?: Project) {
    if (!['project', 'member'].includes(kind) && !data.projects.length) {
      notify(t.noProject);
      setForm({ kind: 'project' });
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
              <Registers
                kind="procurement"
                search={search}
                onCreate={() => open('request')}
              />
            }
          />
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
