import { useState } from 'react';
import { BudgetCharts } from '../components/BudgetCharts';
import { Info, Trash2 } from 'lucide-react';
import { budgetTotals } from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { AddButton, Empty } from '../components/ui';
export default function Budget({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) {
  const { t, money } = useI18n();
  const { data, update, canWrite, pending } = useWorkspace();
  const writable = canWrite('budgetLines');
  const [project, setProject] = useState('all');
  const lines = data.budgetLines.filter(
    (line) =>
      (project === 'all' || line.projectId === project) &&
      line.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const totals = budgetTotals(lines);
  const chart = data.projects
    .filter(
      (item) =>
        (project === 'all' || item.id === project) &&
        lines.some((line) => line.projectId === item.id),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      ...budgetTotals(lines.filter((line) => line.projectId === item.id)),
    }));
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>{t.budget}</h1>
          <p>{t.budgetSub}</p>
        </div>
        {writable && <AddButton onClick={onCreate}>{t.addLine}</AddButton>}
      </div>
      <div className="toolbar">
        <select
          aria-label={t.project}
          value={project}
          onChange={(event) => setProject(event.target.value)}
        >
          <option value="all">{t.projectFilter}</option>
          {data.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="metrics budget-metrics">
        {(['planned', 'actual', 'committed', 'variance'] as const).map(
          (key) => (
            <div className="metric" key={key}>
              <span className="muted">{t[key]}</span>
              <strong
                className={`metric-value ${key === 'variance' && totals.variance < 0 ? 'danger-text' : ''}`}
              >
                {lines.length ? money(totals[key]) : '—'}
              </strong>
              <small>KZT</small>
            </div>
          ),
        )}
      </div>
      <div className="info-note">
        <Info size={17} />
        {t.budgetMethod}
      </div>
      {lines.length ? (
        <>
          <BudgetCharts chart={chart} totals={totals} />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t.budgetLine}</th>
                  <th>{t.project}</th>
                  <th>{t.category}</th>
                  <th>{t.planned}</th>
                  <th>{t.actual}</th>
                  <th>{t.committed}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <strong>{line.name}</strong>
                    </td>
                    <td>
                      {
                        data.projects.find((item) => item.id === line.projectId)
                          ?.name
                      }
                    </td>
                    <td>{t[line.category]}</td>
                    <td>{money(line.planned)}</td>
                    <td>{money(line.actual)}</td>
                    <td>{money(line.committed)}</td>
                    <td>
                      {writable && (
                        <button
                          className="icon-button"
                          disabled={pending}
                          aria-label={`${t.delete}: ${line.name}`}
                          onClick={() => {
                            if (window.confirm(t.deleteConfirm))
                              update(
                                (draft) => {
                                  draft.budgetLines = draft.budgetLines.filter(
                                    (item) => item.id !== line.id,
                                  );
                                },
                                'eventDelete',
                                line.name,
                              );
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="panel">
          <Empty
            action={
              writable ? (
                <AddButton onClick={onCreate}>{t.addLine}</AddButton>
              ) : undefined
            }
          />
        </div>
      )}
    </>
  );
}
