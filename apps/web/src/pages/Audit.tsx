import { useInfiniteQuery } from '@tanstack/react-query';
import { auditResponseSchema } from '@buildos/shared';
import { useAuth } from '../auth/context';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { api } from '../data/api';
import { Empty } from '../components/ui';
import '../access-operations.css';
export function Audit({ search }: { search: string }) {
  const { t, date } = useI18n();
  const { session } = useAuth();
  const { demo, data } = useWorkspace();
  const query = useInfiniteQuery({
    queryKey: ['audit', session?.user.companyId],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      api(
        `/audit?limit=50${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ''}`,
        auditResponseSchema,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !demo,
    retry: 1,
  });
  const events = demo
    ? data.activity.map((item) => ({
        id: item.id,
        actorName: 'Demo',
        action: t[item.kind],
        collection: item.title,
        recordId: null,
        projectId: item.projectId ?? null,
        createdAt: item.createdAt,
      }))
    : (query.data?.pages.flatMap((page) => page.events) ?? []);
  const actions: Record<string, string> = {
    create: t.accessCreate,
    update: t.accessUpdate,
    delete: t.accessDelete,
    'file.upload': t.accessUpload,
    'file.delete': t.accessFileDelete,
    'access.update': t.accessGrant,
    'recovery.issue': t.accessRecoveryIssue,
    'recovery.consume': t.accessRecoveryConsume,
  };
  const collections: Record<string, string> = {
    projects: t.projects,
    tasks: t.tasks,
    issues: t.issues,
    budgetLines: t.budget,
    documents: t.documents,
    requests: t.accessRequests,
    suppliers: t.accessSuppliers,
    stockMovements: t.accessStock,
    payments: t.accessPayments,
    stages: t.accessStages,
    members: t.team,
    users: t.team,
  };
  const shown = events.filter((event) =>
    `${event.actorName} ${actions[event.action] ?? event.action} ${collections[event.collection] ?? event.collection} ${event.recordId ?? ''}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>{t.accessAudit}</h1>
          <p>{demo ? t.accessDemoAudit : t.accessAuditHint}</p>
        </div>
      </div>
      {!demo && query.isPending ? (
        <div className="loading-skeleton">
          <span />
          <span />
        </div>
      ) : !demo && query.isError ? (
        <div className="panel">
          <Empty
            title={t.serverUnavailable}
            action={
              <button className="button" onClick={() => void query.refetch()}>
                {t.retry}
              </button>
            }
          />
        </div>
      ) : (
        <section className="panel audit-list">
          {shown.length === 0 ? (
            <Empty title={t.accessAuditEmpty} />
          ) : (
            shown.map((event) => (
              <article className="audit-row" key={event.id}>
                <div>
                  <strong>{event.actorName}</strong>
                  <small>{date(event.createdAt)}</small>
                </div>
                <div>
                  {actions[event.action] ?? event.action}
                  <small>
                    {collections[event.collection] ?? event.collection}
                  </small>
                </div>
                <div>
                  {event.recordId}
                  <small>
                    {
                      data.projects.find(
                        (project) => project.id === event.projectId,
                      )?.name
                    }
                  </small>
                </div>
              </article>
            ))
          )}
          {!demo && query.hasNextPage && (
            <button
              className="button"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {t.accessLoadMore}
            </button>
          )}
        </section>
      )}
    </>
  );
}
