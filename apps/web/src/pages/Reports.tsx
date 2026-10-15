import { useState } from 'react';
import { budgetTotals, paymentTotals, safeCsv, dateKey } from '@buildos/shared';
import { Download, Printer } from 'lucide-react';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { docsMessages } from '../i18n/operations-docs';
import {
  procurementRu,
  procurementEn,
  procurementKk,
} from '../i18n/operations-procurement';
import { downloadBlob } from '../data/files';
import { Empty } from '../components/ui';
export function Reports({ search }: { search: string }) {
  const { t, locale, money, date } = useI18n();
  const d = docsMessages[locale];
  const procurement = {
    ru: procurementRu,
    en: procurementEn,
    kk: procurementKk,
  }[locale];
  const requestLabels = {
    requested: procurement.procurementDraft,
    submitted: procurement.procurementSubmitted,
    approved: procurement.procurementApproved,
    rejected: procurement.procurementRejected,
    ordered: procurement.procurementOrdered,
    received: procurement.procurementReceived,
    cancelled: procurement.procurementCancelled,
  };
  const { data } = useWorkspace();
  const [project, setProject] = useState('');
  const matches = (projectId: string, text: string) =>
    (!project || projectId === project) &&
    text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const tasks = data.tasks.filter((item) =>
    matches(item.projectId, item.title),
  );
  const issues = data.issues.filter((item) =>
    matches(item.projectId, `${item.title} ${item.description}`),
  );
  const budgets = data.budgetLines.filter((item) =>
    matches(item.projectId, item.name),
  );
  const payments = data.payments.filter((item) =>
    matches(item.projectId, `${item.payee} ${item.reference} ${item.note}`),
  );
  const requests = data.requests.filter((item) =>
    matches(item.projectId, item.name),
  );
  const stock = data.stockMovements.filter((item) =>
    matches(
      item.projectId,
      `${data.requests.find((request) => request.id === item.requestId)?.name ?? ''} ${item.note}`,
    ),
  );
  const budget = budgetTotals(budgets);
  const cash = paymentTotals(payments);
  const paymentLabels = {
    planned: d.dfPlanned,
    paid: d.dfPaid,
    cancelled: d.dfCancelled,
  };
  const label = (value: string) =>
    value in t ? t[value as keyof typeof t] : value;
  type Row = {
    section: string;
    projectId: string;
    name: string;
    status: string;
    due?: string;
    paidOn?: string;
    amount?: number;
    quantity?: number;
    unit?: string;
    planned?: number;
    actual?: number;
    committed?: number;
    reference?: string;
    note?: string;
  };
  const rows: Row[] = [
    ...tasks.map((item) => ({
      section: d.dfTasks,
      projectId: item.projectId,
      name: item.title,
      status: label(item.status),
      due: item.due,
    })),
    ...issues.map((item) => ({
      section: d.dfIssues,
      projectId: item.projectId,
      name: item.title,
      status: label(item.status),
      due: item.due,
      note: item.description,
    })),
    ...budgets.map((item) => ({
      section: t.budget,
      projectId: item.projectId,
      name: item.name,
      status: label(item.category),
      planned: item.planned,
      actual: item.actual,
      committed: item.committed,
    })),
    ...payments.map((item) => ({
      section: d.finance,
      projectId: item.projectId,
      name: item.payee,
      status: paymentLabels[item.status],
      due: item.due,
      paidOn: item.paidOn,
      amount: item.amount,
      reference: item.reference,
      note: item.note,
    })),
    ...requests.map((item) => ({
      section: d.dfRequests,
      projectId: item.projectId,
      name: item.name,
      status: requestLabels[item.status],
      due: item.due,
      quantity: item.quantity,
      unit: item.unit,
      amount: item.quantity * item.unitPrice,
    })),
    ...stock.map((item) => {
      const request = data.requests.find(
        (value) => value.id === item.requestId,
      );
      return {
        section: d.dfStock,
        projectId: item.projectId,
        name: request?.name ?? item.requestId,
        status: item.direction === 'IN' ? d.dfIn : d.dfOut,
        due: item.date,
        quantity: item.quantity,
        unit: request?.unit,
        note: item.note,
      };
    }),
  ];
  const headers = [
    d.dfSection,
    t.project,
    d.dfName,
    d.dfStatus,
    t.date,
    d.dfPaidOn,
    d.dfAmount,
    d.dfQuantity,
    d.dfUnit,
    t.planned,
    t.actual,
    t.committed,
    d.dfReference,
    d.dfNote,
  ];
  const projectName = (id: string) =>
    data.projects.find((item) => item.id === id)?.name ?? id;
  function exportCsv() {
    const csv = safeCsv([
      headers,
      ...rows.map((item) => [
        item.section,
        projectName(item.projectId),
        item.name,
        item.status,
        item.due,
        item.paidOn,
        item.amount,
        item.quantity,
        item.unit,
        item.planned,
        item.actual,
        item.committed,
        item.reference,
        item.note,
      ]),
    ]);
    downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `buildos-report-${dateKey(new Date())}.csv`,
    );
  }
  return (
    <div className="df-report">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>{d.reports}</h1>
          <p>{d.dfReportHint}</p>
        </div>
        <div className="button-row df-actions df-no-print">
          <button
            className="button"
            disabled={!rows.length}
            onClick={exportCsv}
          >
            <Download size={17} />
            {d.dfCsv}
          </button>
          <button className="button primary" onClick={() => window.print()}>
            <Printer size={17} />
            {d.dfPrint}
          </button>
        </div>
      </div>
      <div className="toolbar df-no-print">
        <select
          aria-label={t.projectFilter}
          value={project}
          onChange={(event) => setProject(event.target.value)}
        >
          <option value="">{t.projectFilter}</option>
          {data.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <p className="df-report-scope">
        {project ? projectName(project) : t.projectFilter} ·{' '}
        {date(new Date().toISOString())}
        {search ? ` · ${search}` : ''}
      </p>
      <div className="metrics df-metrics">
        <div className="metric">
          <span className="muted">{d.dfTasks}</span>
          <strong className="metric-value">
            {tasks.filter((item) => item.status === 'DONE').length} /{' '}
            {tasks.length}
          </strong>
          <small>{label('DONE')}</small>
        </div>
        <div className="metric">
          <span className="muted">{d.dfIssues}</span>
          <strong className="metric-value">
            {issues.filter((item) => item.status !== 'RESOLVED').length}
          </strong>
          <small>{label('OPEN')}</small>
        </div>
        <div className="metric">
          <span className="muted">{d.dfRequests}</span>
          <strong className="metric-value">{requests.length}</strong>
          <small>{d.dfRecords}</small>
        </div>
      </div>
      <div className="metrics df-metrics">
        {(
          [
            { title: t.planned, value: budget.planned },
            { title: t.actual, value: budget.actual },
            { title: t.committed, value: budget.committed },
            { title: d.dfPlanned, value: cash.planned },
            { title: d.dfPaid, value: cash.paid },
          ] as const
        ).map((item, index) => (
          <div className="metric" key={index}>
            <span className="muted">
              {index < 3 ? t.budget : d.finance} · {item.title}
            </span>
            <strong className="metric-value">{money(item.value)}</strong>
            <small>KZT</small>
          </div>
        ))}
      </div>
      <p className="info-note">{d.dfCashHint}</p>
      {rows.length ? (
        <div className="table-container df-report-table">
          <table>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={index}>
                  <td>{item.section}</td>
                  <td>{projectName(item.projectId)}</td>
                  <td>{item.name}</td>
                  <td>{item.status}</td>
                  <td>{item.due ? date(item.due) : '—'}</td>
                  <td>{item.paidOn ? date(item.paidOn) : '—'}</td>
                  <td>
                    {item.amount !== undefined ? money(item.amount) : '—'}
                  </td>
                  <td>{item.quantity ?? '—'}</td>
                  <td>{item.unit ?? '—'}</td>
                  <td>
                    {item.planned !== undefined ? money(item.planned) : '—'}
                  </td>
                  <td>
                    {item.actual !== undefined ? money(item.actual) : '—'}
                  </td>
                  <td>
                    {item.committed !== undefined ? money(item.committed) : '—'}
                  </td>
                  <td>{item.reference || '—'}</td>
                  <td>{item.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <Empty title={d.dfReportEmpty} />
        </div>
      )}
    </div>
  );
}
