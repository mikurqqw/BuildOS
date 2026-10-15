import { useState } from 'react';
import { useI18n } from '../i18n/context';
import { useWorkspace } from '../data/workspace';
import { ProjectCard } from '../components/ProjectCard';
import { AddButton, Empty } from '../components/ui';
export function Projects({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) {
  const { t } = useI18n();
  const { data } = useWorkspace();
  const [status, setStatus] = useState('all');
  const projects = data.projects.filter(
    (project) =>
      (status === 'all' || project.status === status) &&
      `${project.name} ${project.customer} ${project.city}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.workspace}</div>
          <h1>
            {t.projects}
            <span className="heading-count">{data.projects.length}</span>
          </h1>
          <p>{t.projectSub}</p>
        </div>
        <AddButton onClick={onCreate}>{t.newProject}</AddButton>
      </div>
      <div className="tab-row">
        {(['all', 'ACTIVE', 'PLANNING', 'COMPLETED', 'ON_HOLD'] as const).map(
          (value) => (
            <button
              className={status === value ? 'selected' : ''}
              key={value}
              onClick={() => setStatus(value)}
            >
              {value === 'all' ? t.all : t[value]}
            </button>
          ),
        )}
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title={data.projects.length ? t.noResults : t.emptyTitle}
            hint={data.projects.length ? t.resetSearch : t.emptySub}
            action={<AddButton onClick={onCreate}>{t.newProject}</AddButton>}
          />
        </div>
      )}
    </>
  );
}
