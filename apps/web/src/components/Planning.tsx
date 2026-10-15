import { useState, type FormEvent } from 'react';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import {
  stageSchema,
  workspaceSchema,
  type Stage,
  type Task,
} from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { planningMessages } from '../i18n/operations-planning';
import { AddButton, Empty, Modal } from './ui';
import '../planning.css';

export function TaskPlanningDialog({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const { data, update, notify, pending, canWrite } = useWorkspace();
  const { t, locale } = useI18n();
  const p = planningMessages[locale];
  const task = data.tasks.find((item) => item.id === taskId);
  return (
    <Modal
      open={!!task}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={p.planning}
    >
      {task && (
        <TaskPlanningForm
          key={task.id}
          task={task}
          onClose={onClose}
          save={async (changes) => {
            if (!canWrite('tasks')) return false;
            const next = structuredClone(data);
            const index = next.tasks.findIndex((item) => item.id === task.id);
            next.tasks[index] = { ...task, ...changes };
            if (!workspaceSchema.safeParse(next).success) return false;
            const ok = await update(
              (draft) => {
                const target = draft.tasks.find((item) => item.id === task.id);
                if (!target) throw new Error('Task changed');
                Object.assign(target, changes);
              },
              'eventUpdate',
              task.title,
            );
            if (ok) notify(t.saved);
            return ok;
          }}
        />
      )}
    </Modal>
  );
}

function TaskPlanningForm({
  task,
  onClose,
  save,
}: {
  task: Task;
  onClose: () => void;
  save: (
    changes: Pick<Task, 'start' | 'due' | 'stageId' | 'dependsOn'>,
  ) => Promise<boolean>;
}) {
  const { data, pending, canWrite } = useWorkspace();
  const { t, locale, date } = useI18n();
  const p = planningMessages[locale];
  const [error, setError] = useState('');
  const [dependencies, setDependencies] = useState(task.dependsOn);
  const [stageId, setStageId] = useState(task.stageId ?? '');
  const stage = data.stages.find((item) => item.id === stageId);
  const descendants = new Set<string>([task.id]);
  const followers = new Map<string, string[]>();
  for (const candidate of data.tasks) {
    for (const predecessor of candidate.dependsOn) {
      const list = followers.get(predecessor) ?? [];
      list.push(candidate.id);
      followers.set(predecessor, list);
    }
  }
  const queue = [task.id];
  for (let index = 0; index < queue.length; index++) {
    for (const follower of followers.get(queue[index] ?? '') ?? []) {
      if (descendants.has(follower)) continue;
      descendants.add(follower);
      queue.push(follower);
    }
  }
  const candidates = data.tasks.filter(
    (item) => item.projectId === task.projectId && !descendants.has(item.id),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const ok = await save({
      start: String(values.get('start') ?? '') || undefined,
      due: String(values.get('due') ?? ''),
      stageId: stageId || undefined,
      dependsOn: dependencies,
    });
    if (ok) onClose();
    else setError(p.planningInvalid);
  }
  return (
    <form
      className="record-form planning-form"
      onSubmit={(event) => void submit(event)}
    >
      <div className="planning-form-title">
        <strong>{task.title}</strong>
        <span>
          {data.projects.find((item) => item.id === task.projectId)?.name}
        </span>
      </div>
      <fieldset
        disabled={pending || !canWrite('tasks')}
        className="planning-fields"
      >
        <label>
          {p.planningStart}
          <input
            type="date"
            name="start"
            defaultValue={task.start ?? ''}
            min={stage?.start}
            max={stage?.end}
          />
        </label>
        <label>
          {t.due}
          <input
            type="date"
            name="due"
            defaultValue={task.due}
            min={stage?.start}
            max={stage?.end}
            required
          />
        </label>
        <label className="planning-wide">
          {p.planningStage}
          <select
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
          >
            <option value="">{p.planningNoStage}</option>
            {data.stages
              .filter((item) => item.projectId === task.projectId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {date(item.start)} — {date(item.end)}
                </option>
              ))}
          </select>
        </label>
        <fieldset className="planning-dependencies planning-wide">
          <legend>{p.planningDependencies}</legend>
          <p>{p.planningDependenciesHint}</p>
          {candidates.length ? (
            <div className="planning-predecessors">
              {candidates.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={dependencies.includes(item.id)}
                    onChange={(event) =>
                      setDependencies((current) =>
                        event.target.checked
                          ? [...current, item.id]
                          : current.filter((id) => id !== item.id),
                      )
                    }
                  />
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {t[item.status]} · {date(item.due)}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p>{p.planningNoCandidates}</p>
          )}
        </fieldset>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={onClose}
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={pending || !canWrite('tasks')}
        >
          {pending ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}

export function TaskPlanningSummary({ task }: { task: Task }) {
  const { data } = useWorkspace();
  const { locale, date } = useI18n();
  const p = planningMessages[locale];
  const stage = data.stages.find((item) => item.id === task.stageId);
  const blocked = task.dependsOn.some(
    (id) => data.tasks.find((item) => item.id === id)?.status !== 'DONE',
  );
  if (!stage && !task.start && !task.dependsOn.length) return null;
  return (
    <div className="planning-task-summary">
      {task.start && (
        <span>
          {date(task.start)} — {date(task.due)}
        </span>
      )}
      {stage && (
        <span>
          {p.planningStage}: {stage.name}
        </span>
      )}
      {task.dependsOn.length > 0 && (
        <span
          className={blocked ? 'planning-blocked' : ''}
          title={task.dependsOn
            .map((id) => data.tasks.find((item) => item.id === id)?.title ?? id)
            .join(', ')}
        >
          {p.planningDependencies}: {task.dependsOn.length} ·{' '}
          {blocked ? p.planningBlocked : p.planningReady}
        </span>
      )}
    </div>
  );
}

export function StageManager({ projectId }: { projectId?: string }) {
  const { data, pending, update, notify, canWrite } = useWorkspace();
  const { t, locale, date } = useI18n();
  const p = planningMessages[locale];
  const [editing, setEditing] = useState<Stage | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Stage | null>(null);
  const [error, setError] = useState('');
  const [formProject, setFormProject] = useState('');
  const stages = data.stages
    .filter((item) => !projectId || item.projectId === projectId)
    .sort((a, b) => a.start.localeCompare(b.start));
  const selectedProject = data.projects.find((item) => item.id === formProject);
  const current = editing && editing !== 'new' ? editing : undefined;
  function open(value: Stage | 'new') {
    setError('');
    setEditing(value);
    setFormProject(
      value === 'new'
        ? (projectId ?? data.projects[0]?.id ?? '')
        : value.projectId,
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = new FormData(event.currentTarget);
    const parsed = stageSchema.safeParse({
      id: current?.id ?? crypto.randomUUID(),
      projectId: formProject,
      name: String(values.get('name') ?? ''),
      start: String(values.get('start') ?? ''),
      end: String(values.get('end') ?? ''),
    });
    if (!parsed.success) {
      setError(p.planningInvalid);
      return;
    }
    const next = structuredClone(data);
    if (current)
      next.stages = next.stages.map((item) =>
        item.id === current.id ? parsed.data : item,
      );
    else next.stages.push(parsed.data);
    if (!workspaceSchema.safeParse(next).success) {
      setError(p.planningInvalid);
      return;
    }
    const ok = await update(
      (draft) => {
        if (current) {
          const index = draft.stages.findIndex(
            (item) => item.id === current.id,
          );
          if (index < 0) throw new Error('Stage changed');
          draft.stages[index] = parsed.data;
        } else draft.stages.push(parsed.data);
      },
      'eventUpdate',
      parsed.data.name,
    );
    if (ok) {
      setEditing(null);
      notify(t.saved);
    }
  }
  async function remove() {
    if (!deleting) return;
    if (data.tasks.some((item) => item.stageId === deleting.id)) {
      notify(p.planningReferenced);
      return;
    }
    const ok = await update(
      (draft) => {
        if (draft.tasks.some((item) => item.stageId === deleting.id))
          throw new Error('Stage referenced');
        draft.stages = draft.stages.filter((item) => item.id !== deleting.id);
      },
      'eventDelete',
      deleting.name,
    );
    if (ok) {
      setDeleting(null);
      notify(t.saved);
    }
  }
  return (
    <section className="panel planning-stage-panel">
      <div className="section-heading">
        <div>
          <h2>{p.planningStages}</h2>
          <p>{p.planningStagesHint}</p>
        </div>
        {canWrite('stages') && data.projects.length > 0 && (
          <AddButton onClick={() => open('new')}>
            {p.planningAddStage}
          </AddButton>
        )}
      </div>
      {stages.length ? (
        <div className="planning-stage-list">
          {stages.map((item) => {
            const count = data.tasks.filter(
              (task) => task.stageId === item.id,
            ).length;
            return (
              <article key={item.id} className="planning-stage-card">
                <CalendarDays size={18} />
                <div>
                  <h3>{item.name}</h3>
                  <span>
                    {
                      data.projects.find(
                        (project) => project.id === item.projectId,
                      )?.name
                    }
                  </span>
                  <p>
                    {date(item.start)} — {date(item.end)}
                  </p>
                  <small>
                    {p.planningTaskCount}: {count}
                  </small>
                </div>
                {canWrite('stages') && (
                  <div className="planning-stage-actions">
                    <button
                      className="icon-button"
                      disabled={pending}
                      aria-label={`${p.planningEditStage}: ${item.name}`}
                      onClick={() => open(item)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={pending || count > 0}
                      title={count > 0 ? p.planningReferenced : t.delete}
                      aria-label={`${t.delete}: ${item.name}`}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title={p.planningEmpty} hint={p.planningStagesHint} />
      )}
      <Modal
        open={!!editing}
        onClose={() => {
          if (!pending) setEditing(null);
        }}
        title={current ? p.planningEditStage : p.planningAddStage}
      >
        {editing && (
          <form
            className="record-form planning-form"
            key={current?.id ?? 'new'}
            onSubmit={(event) => void save(event)}
          >
            <label className="planning-wide">
              {p.planningName}
              <input
                name="name"
                minLength={2}
                maxLength={200}
                required
                defaultValue={current?.name ?? ''}
              />
            </label>
            <label className="planning-wide">
              {t.project}
              <select
                value={formProject}
                disabled={!!current}
                onChange={(event) => setFormProject(event.target.value)}
                required
              >
                {data.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {p.planningStart}
              <input
                key={`start-${formProject}`}
                name="start"
                type="date"
                required
                min={selectedProject?.start}
                max={selectedProject?.end}
                defaultValue={current?.start ?? selectedProject?.start ?? ''}
              />
            </label>
            <label>
              {p.planningEnd}
              <input
                key={`end-${formProject}`}
                name="end"
                type="date"
                required
                min={selectedProject?.start}
                max={selectedProject?.end}
                defaultValue={current?.end ?? selectedProject?.end ?? ''}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={() => setEditing(null)}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={pending}
              >
                {pending ? t.saving : t.save}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => {
          if (!pending) setDeleting(null);
        }}
        title={p.planningDelete}
      >
        <div className="planning-delete">
          <p>{deleting?.name}</p>
          <div className="form-actions">
            <button
              className="button"
              disabled={pending}
              onClick={() => setDeleting(null)}
            >
              {t.cancel}
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => void remove()}
            >
              {pending ? t.saving : t.delete}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
