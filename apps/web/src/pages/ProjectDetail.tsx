import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  MapPin,
  Pencil,
  CalendarDays,
  Plus,
  Info,
} from 'lucide-react';
import { progress, type Project } from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { Architecture } from '../components/Architecture';
import { Empty, Status } from '../components/ui';
export function ProjectDetail({
  onEdit,
  onTask,
}: {
  onEdit: (project: Project) => void;
  onTask: (id: string) => void;
}) {
  const { id } = useParams();
  const { data } = useWorkspace();
  const { t, date, money } = useI18n();
  const project = data.projects.find((item) => item.id === id);
  if (!project)
    return (
      <Empty
        title={t.noResults}
        action={
          <Link className="button" to="/projects">
            {t.back}
          </Link>
        }
      />
    );
  const tasks = data.tasks.filter((item) => item.projectId === id);
  const value = progress(tasks);
  return (
    <>
      <Link className="text-button back-link" to="/projects">
        <ArrowLeft size={16} />
        {t.projects}
      </Link>
      <div className="project-hero">
        <div>
          <Status value={project.status} />
          <h1>{project.name}</h1>
          <p>
            <MapPin size={16} />
            {project.city || '—'}
          </p>
          <button className="button" onClick={() => onEdit(project)}>
            <Pencil size={15} />
            {t.editProject}
          </button>
        </div>
        <Architecture variant={15} />
      </div>
      <div className="project-facts panel">
        <div>
          <span>{t.customer}</span>
          <strong>{project.customer || '—'}</strong>
        </div>
        <div>
          <span>{t.budget}</span>
          <strong>{money(project.budget)}</strong>
        </div>
        <div>
          <span>{t.start}</span>
          <strong>
            <CalendarDays size={15} />
            {date(project.start)}
          </strong>
        </div>
        <div>
          <span>{t.end}</span>
          <strong>{date(project.end)}</strong>
        </div>
        <div>
          <span>{t.progress}</span>
          <strong>{value === null ? '—' : `${value}%`}</strong>
        </div>
      </div>
      <div className="info-note">
        <Info size={17} />
        {t.progressMethod}
      </div>
      <div className="section-heading">
        <h2>{t.tasks}</h2>
        <button className="button primary" onClick={() => onTask(project.id)}>
          <Plus size={17} />
          {t.newTask}
        </button>
      </div>
      {tasks.length ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.title}</th>
                <th>{t.assignee}</th>
                <th>{t.due}</th>
                <th>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link to="/tasks">{task.title}</Link>
                  </td>
                  <td>{task.assignee || '—'}</td>
                  <td>{date(task.due)}</td>
                  <td>
                    <Status value={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <Empty />
        </div>
      )}
    </>
  );
}
