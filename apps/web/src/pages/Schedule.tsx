import { useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarDays,
  ChevronDown,
  ArrowUpRight,
  CheckCheck,
  Flag,
  Clock3,
  ListChecks,
} from 'lucide-react';
import { createTimeline, dateKey, progress } from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { Status, Empty } from '../components/ui';
import { StageManager, TaskPlanningDialog } from '../components/Planning';
import { planningMessages } from '../i18n/operations-planning';
export function Schedule() {
  const { data, canWrite, pending } = useWorkspace();
  const { t, date, locale } = useI18n();
  const p = planningMessages[locale];
  const [planning, setPlanning] = useState<string | null>(null);
  const [project, setProject] = useState('all');
  const [quarters, setQuarters] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [view, setView] = useState<'timeline' | 'deadlines'>('timeline');
  const projects = data.projects.filter(
    (item) => project === 'all' || item.id === project,
  );
  const calendar = createTimeline(
    projects.map((item) => {
      const tasks = data.tasks.filter((task) => task.projectId === item.id);
      return {
        ...item,
        start:
          [
            item.start,
            ...tasks.map((task) => task.start ?? task.due),
          ].sort()[0] ?? item.start,
        end:
          [item.end, ...tasks.map((task) => task.due)].sort().at(-1) ??
          item.end,
      };
    }),
    quarters,
  );
  const selectedTasks = data.tasks.filter((task) =>
    projects.some((project) => project.id === task.projectId),
  );
  const upcoming = selectedTasks
    .filter(
      (task) =>
        !['DONE', 'CANCELLED'].includes(task.status) && task.due >= dateKey(),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const today = calendar?.position(dateKey()) ?? -1;
  const unfinished = selectedTasks
    .filter((task) => !['DONE', 'CANCELLED'].includes(task.status))
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.construction}</div>
          <h1>{t.schedule}</h1>
          <p>{t.timelineHint}</p>
        </div>
        <div className="page-heading-symbol">
          <CalendarDays size={26} />
        </div>
      </div>
      <div className="register-summary schedule-summary">
        {[
          {
            label: t.scheduleProjects,
            value: projects.length,
            icon: CalendarDays,
          },
          {
            label: t.scheduleComplete,
            value: `${selectedTasks.filter((task) => task.status === 'DONE').length} / ${selectedTasks.filter((task) => task.status !== 'CANCELLED').length}`,
            icon: CheckCheck,
          },
          {
            label: t.nextDeadline,
            value: upcoming[0] ? date(upcoming[0].due) : '—',
            icon: Clock3,
          },
        ].map((item) => (
          <div key={item.label}>
            <span className="summary-icon">
              <item.icon size={19} />
            </span>
            <span>
              {item.label}
              <strong>{item.value}</strong>
            </span>
          </div>
        ))}
      </div>
      <div className="schedule-view-switch">
        <div className="segmented">
          <button
            className={view === 'timeline' ? 'selected' : ''}
            aria-pressed={view === 'timeline'}
            onClick={() => setView('timeline')}
          >
            <CalendarDays size={15} />
            {t.calendarView}
          </button>
          <button
            className={view === 'deadlines' ? 'selected' : ''}
            aria-pressed={view === 'deadlines'}
            onClick={() => setView('deadlines')}
          >
            <ListChecks size={15} />
            {t.deadlineView}
          </button>
        </div>
        <span>{view === 'timeline' ? t.timelineHint : t.deadlineHint}</span>
      </div>
      <section className="panel gantt-panel">
        <div className="gantt-toolbar">
          <div>
            <span className="eyebrow">
              {t.projectDates.toLocaleUpperCase()}
            </span>
            <h2>{view === 'timeline' ? t.projectTimeline : t.deadlineView}</h2>
          </div>
          <div className="gantt-controls">
            <select
              value={project}
              aria-label={t.project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option value="all">{t.projectFilter}</option>
              {data.projects.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {view === 'timeline' && (
              <div className="segmented">
                <button
                  className={!quarters ? 'selected' : ''}
                  onClick={() => setQuarters(false)}
                >
                  {t.months}
                </button>
                <button
                  className={quarters ? 'selected' : ''}
                  onClick={() => setQuarters(true)}
                >
                  {t.quarters}
                </button>
              </div>
            )}
          </div>
        </div>
        {!calendar ? (
          <Empty hint={t.scheduleEmpty} />
        ) : view === 'deadlines' ? (
          <div className="deadline-agenda">
            {unfinished.length === 0 ? (
              <Empty hint={t.noUpcomingTasks} />
            ) : (
              <>
                <div className="deadline-agenda-count">
                  {t.deadlineCount}: <strong>{unfinished.length}</strong>
                </div>
                {unfinished.slice(0, 40).map((task) => {
                  const parent = projects.find(
                    (item) => item.id === task.projectId,
                  );
                  const overdue = task.due < dateKey();
                  return (
                    <Link
                      to={`/projects/${task.projectId}`}
                      key={task.id}
                      className={`deadline-agenda-item ${overdue ? 'overdue' : ''}`}
                    >
                      <div className="deadline-date">
                        <strong>{task.due.slice(-2)}</strong>
                        <span>{date(task.due).replace(/^\d+\s/, '')}</span>
                      </div>
                      <div className="deadline-agenda-copy">
                        <span>{parent?.name}</span>
                        <strong>{task.title}</strong>
                        <small>{task.assignee || '—'}</small>
                      </div>
                      <Status value={overdue ? 'overdue' : task.status} />
                      <ArrowUpRight size={18} />
                    </Link>
                  );
                })}
                {unfinished.length > 40 && (
                  <Link to="/tasks" className="text-button">
                    {t.allTasks} ({unfinished.length})<ArrowUpRight size={14} />
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="gantt-scroll">
              <div
                className="gantt-grid"
                style={{
                  minWidth:
                    230 +
                    Math.min(18, calendar.ticks.length) * (quarters ? 95 : 86),
                }}
              >
                <div className="gantt-grid-header">
                  <div className="gantt-sticky">
                    {t.project} / {t.tasks}
                  </div>
                  <div className="gantt-calendar-header">
                    {calendar.ticks.map((tick) => (
                      <span key={tick.date} style={{ left: `${tick.left}%` }}>
                        {date(tick.date).replace(/^1\s/, '')}
                      </span>
                    ))}
                    {today >= 0 && today <= 100 && (
                      <b className="today-tag" style={{ left: `${today}%` }}>
                        {t.today}
                      </b>
                    )}
                  </div>
                </div>
                {projects.map((item, index) => {
                  const tasks = selectedTasks.filter(
                    (task) => task.projectId === item.id,
                  );
                  const value = progress(tasks);
                  const open = expanded.includes(item.id);
                  const preview = tasks
                    .filter((task) => task.status !== 'CANCELLED')
                    .sort(
                      (a, b) =>
                        Number(a.status === 'DONE') -
                          Number(b.status === 'DONE') ||
                        a.due.localeCompare(b.due),
                    )
                    .slice(0, 6);
                  return (
                    <div
                      className={`gantt-project-group gantt-color-${index % 3}`}
                      key={item.id}
                    >
                      <div className="gantt-grid-row">
                        <div className="gantt-project-cell gantt-sticky">
                          <button
                            className={`gantt-expand ${open ? 'expanded' : ''}`}
                            aria-label={`${open ? t.hideTasks : t.showTasks}: ${item.name}`}
                            aria-expanded={open}
                            onClick={() =>
                              setExpanded((current) =>
                                open
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
                          >
                            <ChevronDown size={15} />
                          </button>
                          <div>
                            <Link to={`/projects/${item.id}`}>
                              <strong>{item.name}</strong>
                              <ArrowUpRight size={13} />
                            </Link>
                            <span>
                              {date(item.start)} — {date(item.end)}
                            </span>
                            <Status value={item.status} />
                            <div className="gantt-project-mini-progress">
                              <span style={{ width: `${value ?? 0}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="gantt-canvas">
                          {calendar.ticks.map((tick) => (
                            <i
                              className="gantt-gridline"
                              style={{ left: `${tick.left}%` }}
                              key={tick.date}
                            />
                          ))}
                          {today >= 0 && today <= 100 && (
                            <i
                              className="gantt-today-line"
                              style={{ left: `${today}%` }}
                            />
                          )}
                          <div
                            className="gantt-project-bar"
                            style={{
                              left: `${calendar.position(item.start)}%`,
                              width: `${Math.max(0.7, calendar.position(item.end) - calendar.position(item.start))}%`,
                            }}
                          >
                            <span
                              className="gantt-progress-fill"
                              style={{ width: `${value ?? 0}%` }}
                            />
                            <span className="gantt-bar-caption">
                              {item.name}
                            </span>
                            <strong>
                              {value === null ? '—' : `${value}%`}
                            </strong>
                          </div>
                        </div>
                      </div>
                      {open &&
                        data.stages
                          .filter((stage) => stage.projectId === item.id)
                          .sort((a, b) => a.start.localeCompare(b.start))
                          .map((stage) => (
                            <div
                              className="gantt-grid-row gantt-task-row planning-stage-row"
                              key={stage.id}
                            >
                              <div className="gantt-sticky gantt-task-cell">
                                <Flag size={13} />
                                <span title={stage.name}>
                                  {p.planningStage}: {stage.name}
                                </span>
                              </div>
                              <div className="gantt-canvas">
                                <span
                                  className="planning-stage-bar"
                                  style={{
                                    left: `${calendar.position(stage.start)}%`,
                                    width: `${Math.max(0.7, calendar.position(stage.end) - calendar.position(stage.start))}%`,
                                  }}
                                  title={`${stage.name} · ${date(stage.start)} — ${date(stage.end)}`}
                                />
                              </div>
                            </div>
                          ))}
                      {open &&
                        preview.map((task) => (
                          <div
                            className="gantt-grid-row gantt-task-row"
                            key={task.id}
                          >
                            <div className="gantt-sticky gantt-task-cell">
                              <CheckCheck
                                size={13}
                                className={
                                  task.status === 'DONE'
                                    ? 'success-text'
                                    : 'muted'
                                }
                              />
                              <span title={task.title}>{task.title}</span>
                            </div>
                            <div className="gantt-canvas">
                              {calendar.ticks.map((tick) => (
                                <i
                                  className="gantt-gridline"
                                  style={{ left: `${tick.left}%` }}
                                  key={tick.date}
                                />
                              ))}
                              {today >= 0 && today <= 100 && (
                                <i
                                  className="gantt-today-line"
                                  style={{ left: `${today}%` }}
                                />
                              )}
                              {calendar.position(task.due) >= 0 &&
                                calendar.position(task.due) <= 100 &&
                                (task.start ? (
                                  <button
                                    type="button"
                                    className={`planning-task-range ${task.status === 'DONE' ? 'done' : ''}`}
                                    disabled={pending || !canWrite('tasks')}
                                    onClick={() => setPlanning(task.id)}
                                    style={{
                                      left: `${calendar.position(task.start)}%`,
                                      width: `${Math.max(0.7, calendar.position(task.due) - calendar.position(task.start))}%`,
                                    }}
                                    title={`${task.title} · ${date(task.start)} — ${date(task.due)}`}
                                    aria-label={`${p.planning}: ${task.title} · ${date(task.start)} — ${date(task.due)}`}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    className={`gantt-task-pin ${task.status === 'DONE' ? 'done' : ''}`}
                                    disabled={pending || !canWrite('tasks')}
                                    onClick={() => setPlanning(task.id)}
                                    aria-label={`${p.planning}: ${task.title}`}
                                    style={{
                                      left: `${calendar.position(task.due)}%`,
                                    }}
                                    title={`${task.title} · ${date(task.due)}`}
                                  >
                                    <i />
                                    <span>{date(task.due)}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      {open && tasks.length > 6 && (
                        <div className="gantt-more">
                          <Link
                            className="text-button"
                            to={`/projects/${item.id}`}
                          >
                            {t.allTasks} ({tasks.length})
                            <ArrowUpRight size={14} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="gantt-footer">
              <span>
                <i className="legend-line" />
                {t.projectDates}
              </span>
              <span>
                <Flag size={13} />
                {t.taskDates}
              </span>
              <span>
                <i className="legend-today" />
                {t.today}
              </span>
              <small>{t.progressMethod}</small>
            </div>
          </>
        )}
      </section>
      <StageManager projectId={project === 'all' ? undefined : project} />
      <TaskPlanningDialog taskId={planning} onClose={() => setPlanning(null)} />
    </>
  );
}
