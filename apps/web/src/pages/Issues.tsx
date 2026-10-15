import { TriangleAlert, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { AddButton, Empty, Status } from '../components/ui';
export function Issues({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) {
  const { t, date } = useI18n();
  const { data, update } = useWorkspace();
  const issues = data.issues.filter((issue) =>
    `${issue.title} ${issue.description}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.construction}</div>
          <h1>
            {t.issues}
            <span className="heading-count">{issues.length}</span>
          </h1>
          <p>{t.issueHint}</p>
        </div>
        <AddButton onClick={onCreate}>{t.newIssue}</AddButton>
      </div>
      {!issues.length ? (
        <div className="panel">
          <Empty
            action={<AddButton onClick={onCreate}>{t.newIssue}</AddButton>}
          />
        </div>
      ) : (
        <div className="issue-grid">
          {issues.map((issue) => (
            <article className="issue-card panel" key={issue.id}>
              <div className="issue-top">
                <span className="attention-icon orange">
                  <TriangleAlert size={20} />
                </span>
                <Status value={issue.priority} />
              </div>
              <h3>{issue.title}</h3>
              <p>{issue.description}</p>
              <div className="issue-details">
                <span>
                  {t.project}
                  <strong>
                    {
                      data.projects.find((item) => item.id === issue.projectId)
                        ?.name
                    }
                  </strong>
                </span>
                <span>
                  {t.assignee}
                  <strong>{issue.assignee || '—'}</strong>
                </span>
                <span>
                  {t.due}
                  <strong>{date(issue.due)}</strong>
                </span>
              </div>
              <div className="issue-footer">
                <Status value={issue.status} />
                <button
                  className="text-button"
                  onClick={() =>
                    update(
                      (draft) => {
                        const record = draft.issues.find(
                          (item) => item.id === issue.id,
                        );
                        if (record)
                          record.status =
                            issue.status === 'RESOLVED'
                              ? 'OPEN'
                              : issue.status === 'OPEN'
                                ? 'IN_PROGRESS'
                                : 'RESOLVED';
                      },
                      'eventUpdate',
                      issue.title,
                    )
                  }
                >
                  {issue.status === 'RESOLVED'
                    ? t.reopen
                    : issue.status === 'OPEN'
                      ? t.IN_PROGRESS
                      : t.resolve}
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
