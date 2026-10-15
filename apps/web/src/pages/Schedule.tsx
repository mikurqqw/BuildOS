import { useState } from 'react';
import { Link } from 'react-router';
import {
  CalendarDays,
  ChevronDown,
  ArrowUpRight,
  CheckCheck,
  Flag,
  Clock3,
} from 'lucide-react';
import { createTimeline, dateKey, progress } from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { Status, Empty } from '../components/ui';
export function Schedule() {
  const { data } = useWorkspace();
  const { t, date } = useI18n();
  const [project, setProject] = useState('all');
  const [quarters, setQuarters] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);
  const projects = data.projects.filter(
    (item) => project === 'all' || item.id === project,
  );
  const calendar = createTimeline(projects, quarters);
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
      <section className="panel gantt-panel">
        <div className="gantt-toolbar">
          <div>
            <span className="eyebrow">
              {t.projectDates.toLocaleUpperCase()}
            </span>
            <h2>{t.projectTimeline}</h2>
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
          </div>
        </div>
        {!calendar ? (
          <Empty hint={t.scheduleEmpty} />
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
                                calendar.position(task.due) <= 100 && (
                                  <span
                                    className={`gantt-task-pin ${task.status === 'DONE' ? 'done' : ''}`}
                                    style={{
                                      left: `${calendar.position(task.due)}%`,
                                    }}
                                    title={`${task.title} · ${date(task.due)}`}
                                  >
                                    <i />
                                    <span>{date(task.due)}</span>
                                  </span>
                                )}
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
    </>
  );
}
