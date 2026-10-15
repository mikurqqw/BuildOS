import { useState, type FormEvent } from 'react';
import {
  dateKey,
  paymentSchema,
  paymentTotals,
  type Payment,
} from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { docsMessages } from '../i18n/operations-docs';
import { AddButton, Empty, Modal } from '../components/ui';
export function Finance({ search }: { search: string }) {
  const { t, locale, date, money } = useI18n();
  const d = docsMessages[locale];
  const { data, update, notify, canWrite, pending } = useWorkspace();
  const [project, setProject] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<'new' | Payment | null>(null);
  const [formProject, setFormProject] = useState('');
  const [formStatus, setFormStatus] = useState<'planned' | 'paid'>('planned');
  const writable = canWrite('payments');
  const labels = {
    planned: d.dfPlanned,
    paid: d.dfPaid,
    cancelled: d.dfCancelled,
  };
  const payments = data.payments.filter(
    (item) =>
      (!project || item.projectId === project) &&
      (!status || item.status === status) &&
      `${item.payee} ${item.reference} ${item.note}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const totals = paymentTotals(payments);
  function open(value: 'new' | Payment) {
    setForm(value);
    setFormProject(
      value === 'new' ? project || data.projects[0]?.id || '' : value.projectId,
    );
    setFormStatus(value === 'new' ? 'planned' : 'paid');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const existing = form !== 'new' ? form : null;
    const parsed = paymentSchema.safeParse(
      existing
        ? {
            ...existing,
            status: 'paid',
            paidOn: values.get('paidOn'),
            reference: values.get('reference'),
          }
        : {
            projectId: formProject,
            budgetLineId: values.get('budgetLineId') || undefined,
            payee: values.get('payee'),
            amount: Number(values.get('amount')),
            due: values.get('due'),
            status: formStatus,
            paidOn: formStatus === 'paid' ? values.get('paidOn') : undefined,
            reference: formStatus === 'paid' ? values.get('reference') : '',
            note: values.get('note'),
          },
    );
    if (
      !parsed.success ||
      (parsed.data.status === 'paid' &&
        (!parsed.data.paidOn || !parsed.data.reference))
    ) {
      notify(d.dfPaymentError);
      return;
    }
    const record = parsed.data;
    if (
      await update(
        (draft) => {
          if (existing) {
            const index = draft.payments.findIndex(
              (item) => item.id === existing.id,
            );
            if (index >= 0) draft.payments[index] = record;
          } else draft.payments.push(record);
        },
        'eventBudget',
        record.payee,
      )
    )
      setForm(null);
  }
  async function cancel(payment: Payment) {
    if (!window.confirm(t.deleteConfirm)) return;
    await update(
      (draft) => {
        const record = draft.payments.find((item) => item.id === payment.id);
        if (record) record.status = 'cancelled';
      },
      'eventBudget',
      payment.payee,
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>{d.finance}</h1>
          <p>{d.dfCashHint}</p>
        </div>
        {writable && (
          <AddButton onClick={() => open('new')}>{d.dfAddPayment}</AddButton>
        )}
      </div>
      <div className="toolbar">
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
        <select
          aria-label={d.dfStatus}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{d.dfAllStatuses}</option>
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="metrics df-metrics">
        {(['planned', 'paid', 'cancelled'] as const).map((key) => (
          <div className="metric" key={key}>
            <span className="muted">{labels[key]}</span>
            <strong className="metric-value">{money(totals[key])}</strong>
            <small>KZT</small>
          </div>
        ))}
      </div>
      {!writable && <p className="info-note">{d.dfReadOnly}</p>}
      {payments.length ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{d.dfPayee}</th>
                <th>{t.project}</th>
                <th>{t.budgetLine}</th>
                <th>{d.dfAmount}</th>
                <th>{d.dfDue}</th>
                <th>{d.dfStatus}</th>
                <th>{d.dfReference}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.payee}</strong>
                    {item.note && <p className="form-hint">{item.note}</p>}
                  </td>
                  <td>
                    {
                      data.projects.find((value) => value.id === item.projectId)
                        ?.name
                    }
                  </td>
                  <td>
                    {data.budgetLines.find(
                      (value) => value.id === item.budgetLineId,
                    )?.name ?? '—'}
                  </td>
                  <td>{money(item.amount)}</td>
                  <td>{date(item.due)}</td>
                  <td>
                    <span className={`status status-${item.status}`}>
                      {labels[item.status]}
                    </span>
                    {item.paidOn && (
                      <p className="form-hint">{date(item.paidOn)}</p>
                    )}
                  </td>
                  <td>{item.reference || '—'}</td>
                  <td>
                    {writable && item.status === 'planned' && (
                      <div className="button-row df-actions">
                        <button
                          className="button"
                          disabled={pending}
                          onClick={() => open(item)}
                        >
                          {d.dfMarkPaid}
                        </button>
                        <button
                          className="button"
                          disabled={pending}
                          onClick={() => void cancel(item)}
                        >
                          {d.dfCancel}
                        </button>
                      </div>
                    )}
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
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form === 'new' ? d.dfAddPayment : d.dfMarkPaid}
      >
        <form
          className="df-form"
          onSubmit={(event) => void submit(event)}
          key={typeof form === 'object' ? form?.id : form}
        >
          {form === 'new' && (
            <>
              <label>
                {t.project}
                <select
                  required
                  value={formProject}
                  onChange={(event) => setFormProject(event.target.value)}
                >
                  <option value="">{t.project}</option>
                  {data.projects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.budgetLine}
                <select name="budgetLineId" key={formProject}>
                  <option value="">{d.dfNoLine}</option>
                  {data.budgetLines
                    .filter((item) => item.projectId === formProject)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {d.dfPayee}
                <input name="payee" required minLength={2} maxLength={200} />
              </label>
              <label>
                {d.dfAmount}
                <input
                  name="amount"
                  type="number"
                  required
                  min={1}
                  max={100000000000}
                  step={1}
                />
              </label>
              <label>
                {d.dfDue}
                <input
                  name="due"
                  type="date"
                  required
                  defaultValue={dateKey(new Date())}
                />
              </label>
              <label>
                {d.dfStatus}
                <select
                  value={formStatus}
                  onChange={(event) =>
                    setFormStatus(event.target.value as 'planned' | 'paid')
                  }
                >
                  <option value="planned">{d.dfPlanned}</option>
                  <option value="paid">{d.dfPaid}</option>
                </select>
              </label>
              <label>
                {d.dfNote}
                <textarea name="note" maxLength={2000} />
              </label>
            </>
          )}
          {formStatus === 'paid' && (
            <>
              <label>
                {d.dfPaidOn}
                <input
                  name="paidOn"
                  type="date"
                  required
                  defaultValue={dateKey(new Date())}
                />
              </label>
              <label>
                {d.dfReference}
                <input name="reference" required maxLength={200} />
              </label>
            </>
          )}
          <p className="form-hint">{d.dfCashHint}</p>
          <button className="button primary" disabled={pending || !formProject}>
            {pending ? d.dfSaving : t.save}
          </button>
        </form>
      </Modal>
    </>
  );
}
