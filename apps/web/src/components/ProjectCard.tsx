import { ArrowUpRight, MapPin, CalendarDays, CheckSquare } from 'lucide-react';
import { Link } from 'react-router';
import { progress, type Project } from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { Architecture } from './Architecture';
import { Status } from './ui';
export function ProjectCard({
  project,
  index = 0,
}: {
  project: Project;
  index?: number;
}) {
  const { data } = useWorkspace();
  const { t, money, date } = useI18n();
  const tasks = data.tasks.filter((task) => task.projectId === project.id);
  const value = progress(tasks);
  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <div className={`project-art project-art-${index % 3}`}>
        <span className="project-code">
          PRJ / {String(data.projects.indexOf(project) + 1).padStart(3, '0')}
        </span>
        <Architecture variant={index} />
        <span className="project-card-arrow">
          <ArrowUpRight size={19} />
        </span>
      </div>
      <div className="project-card-body">
        <Status value={project.status} />
        <h3>{project.name}</h3>
        <p className="location">
          <MapPin size={13} />
          {project.city || '—'}
        </p>
        <div className="project-progress">
          <div>
            <span>{t.progress}</span>
            <strong>{value === null ? '—' : `${value}%`}</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${value ?? 0}%` }} />
          </div>
        </div>
        <div className="project-card-footer">
          <span>
            <CalendarDays size={14} />
            {date(project.end)}
          </span>
          <span>
            <CheckSquare size={14} />
            {tasks.filter((task) => task.status === 'DONE').length}/
            {tasks.length}
          </span>
        </div>
        <div className="project-budget">
          <span>{t.budget}</span>
          <strong>{money(project.budget)}</strong>
        </div>
      </div>
    </Link>
  );
}
