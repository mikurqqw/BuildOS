import { Link } from 'react-router';
import {
  ArrowUpRight,
  Building2,
  CheckSquare,
  CircleAlert,
  Wallet,
  Plus,
  ArrowRight,
  CheckCheck,
  Activity,
  Layers3,
} from 'lucide-react';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { Architecture } from '../components/Architecture';
import { ProjectCard } from '../components/ProjectCard';
import { SectionHead, Status, Empty } from '../components/ui';
export function Dashboard({ createProject }: { createProject: () => void }) {
  const { t, money, date } = useI18n();
  const { data, setDemo } = useWorkspace();
  const active = data.projects.filter(
    (project) => project.status === 'ACTIVE',
  ).length;
  const cards = [
    {
      label: t.activeProjects,
      value: active,
      icon: Building2,
      sub: `${data.projects.length} ${t.total.toLowerCase()}`,
      tone: 'blue',
      to: '/projects',
    },
    {
      label: t.openTasks,
      value: data.tasks.filter(
        (task) => !['DONE', 'CANCELLED'].includes(task.status),
      ).length,
      icon: CheckSquare,
      sub: `${data.tasks.filter((task) => task.status === 'DONE').length} ${t.completed.toLowerCase()}`,
      tone: 'violet',
      to: '/tasks',
    },
    {
      label: t.openIssues,
      value: data.issues.filter((issue) => issue.status !== 'RESOLVED').length,
      icon: CircleAlert,
      sub: `${data.issues.filter((issue) => issue.priority === 'CRITICAL' && issue.status !== 'RESOLVED').length} ${t.CRITICAL.toLowerCase()}`,
      tone: 'orange',
      to: '/issues',
    },
    {
      label: t.totalBudget,
      value: data.projects.length
        ? money(data.projects.reduce((sum, project) => sum + project.budget, 0))
        : '—',
      icon: Wallet,
      sub: 'KZT · BuildOS',
      tone: 'green',
      to: '/budget',
    },
  ];
  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> BUILDOS / {t.overview.toUpperCase()}
          </div>
          <h1>{t.greeting}</h1>
          <p>{t.greetingSub}</p>
        </div>
        <div className="date-pill">
          <span>{t.today}</span>
          <strong>{date(new Date().toISOString())}</strong>
        </div>
      </div>
      <div className="metrics">
        {cards.map((card) => (
          <Link to={card.to} className="metric" key={card.label}>
            <div className="metric-top">
              <span>{card.label}</span>
              <span className={`metric-icon ${card.tone}`}>
                <card.icon size={18} />
              </span>
            </div>
            <strong className="metric-value">{card.value}</strong>
            <div className="metric-bottom">
              <span>{card.sub}</span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </div>
      <SectionHead
        title={t.projectOverview}
        sub={t.projectSub}
        action={
          <Link className="text-button" to="/projects">
            {t.allProjects}
            <ArrowRight size={16} />
          </Link>
        }
      />
      {data.projects.length ? (
        <div className="project-grid">
          {data.projects.slice(0, 3).map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      ) : (
        <div className="onboarding">
          <div className="onboarding-copy">
            <span className="eyebrow">
              <Layers3 size={15} /> {t.buildTogether.toLocaleUpperCase()}
            </span>
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptySub}</p>
            <div className="button-row">
              <button className="button primary" onClick={createProject}>
                <Plus size={17} />
                {t.createFirst}
              </button>
              <button className="text-button" onClick={() => setDemo(true)}>
                {t.exploreDemo}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="onboarding-art">
            <Architecture variant={10} />
            <span>{t.precision.toLocaleUpperCase()}</span>
          </div>
        </div>
      )}
      <div className="dashboard-bottom">
        <section className="panel">
          <SectionHead
            title={t.attention}
            action={
              <span className="count">
                {
                  data.issues.filter((issue) => issue.status !== 'RESOLVED')
                    .length
                }
              </span>
            }
          />
          {data.issues.filter((issue) => issue.status !== 'RESOLVED').length ? (
            <div className="attention-list">
              {data.issues
                .filter((issue) => issue.status !== 'RESOLVED')
                .slice(0, 3)
                .map((issue) => (
                  <Link to="/issues" key={issue.id} className="attention-row">
                    <span
                      className={`attention-icon ${issue.priority === 'CRITICAL' ? 'red' : 'orange'}`}
                    >
                      <CircleAlert size={19} />
                    </span>
                    <div>
                      <strong>{issue.title}</strong>
                      <span>
                        {
                          data.projects.find(
                            (project) => project.id === issue.projectId,
                          )?.name
                        }{' '}
                        · {date(issue.due)}
                      </span>
                    </div>
                    <Status value={issue.priority} />
                  </Link>
                ))}
            </div>
          ) : (
            <div className="calm-empty">
              <CheckCheck size={27} />
              <div>
                <strong>{t.noAttention}</strong>
                <p>{t.noAttentionSub}</p>
              </div>
            </div>
          )}
        </section>
        <section className="panel">
          <SectionHead
            title={t.activity}
            action={<Activity size={17} className="muted" />}
          />
          {data.activity.length ? (
            <div className="activity-list">
              {data.activity.slice(0, 3).map((event) => (
                <div key={event.id} className="activity-row">
                  <span className="activity-dot" />
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      {t[event.kind]} · {date(event.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty hint={t.noActivity} />
          )}
        </section>
      </div>
      <div className="workspace-signature">
        <span className="brand-mark tiny" /> <span>{t.platform}</span>
        <span>BuildOS © {new Date().getFullYear()}</span>
      </div>
    </>
  );
}
