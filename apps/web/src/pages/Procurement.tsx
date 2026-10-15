import { useState, type FormEvent } from 'react';
import { Package, Truck, Warehouse, Pencil, Trash2 } from 'lucide-react';
import {
  canApprove,
  dateKey,
  materialRequestLabel,
  requestSchema,
  stockBalance,
  stockMovementSchema,
  supplierSchema,
  unitLabel,
  type Workspace,
  type Supplier,
} from '@buildos/shared';
import { useI18n } from '../i18n/context';
import { useWorkspace } from '../data/workspace';
import { AddButton, Empty, Modal } from '../components/ui';
import {
  procurementRu,
  procurementEn,
  procurementKk,
} from '../i18n/operations-procurement';

type Request = Workspace['requests'][number];
type Editor =
  | { kind: 'draft' | 'order' | 'IN' | 'OUT'; id: string }
  | { kind: 'supplier'; id?: string }
  | null;
type Deletion = { kind: 'request' | 'supplier'; id: string } | null;
const statuses = [
  'requested',
  'submitted',
  'approved',
  'rejected',
  'ordered',
  'received',
  'cancelled',
] as const;

export function Procurement({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) {
  const { t, locale, date, money } = useI18n();
  const p = { ru: procurementRu, en: procurementEn, kk: procurementKk }[locale];
  const { data, update, notify, pending, actor, canWrite } = useWorkspace();
  const [tab, setTab] = useState<'requests' | 'suppliers' | 'stock'>(
    'requests',
  );
  const [project, setProject] = useState('all');
  const [status, setStatus] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [editor, setEditor] = useState<Editor>(null);
  const [deletion, setDeletion] = useState<Deletion>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [error, setError] = useState('');
  const number = (value: number) =>
    new Intl.NumberFormat(
      locale === 'en' ? 'en-GB' : locale === 'kk' ? 'kk-KZ' : 'ru-KZ',
      { maximumFractionDigits: 6 },
    ).format(value);
  const matches = (value: string) =>
    value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const projectName = (id: string) =>
    data.projects.find((item) => item.id === id)?.name ?? '—';
  const label = (item: Request) => materialRequestLabel(item, locale);
  const supplierName = (id?: string) =>
    data.suppliers.find((item) => item.id === id)?.name ?? '—';
  const statusLabels: Record<Request['status'], string> = {
    requested: p.procurementDraft,
    submitted: p.procurementSubmitted,
    approved: p.procurementApproved,
    rejected: p.procurementRejected,
    ordered: p.procurementOrdered,
    received: p.procurementReceived,
    cancelled: p.procurementCancelled,
  };
  const canOrder =
    ['OWNER', 'MANAGER', 'PROCUREMENT'].includes(actor.role) &&
    canWrite('requests');
  const canReview = (item: Request) =>
    canApprove(actor) &&
    (actor.role === 'OWNER' || item.createdBy !== actor.id);
  const canManageRequest = (item: Request) =>
    canWrite('requests') &&
    (actor.role !== 'EMPLOYEE' ||
      !item.createdBy ||
      item.createdBy === actor.id);
  const canDraft = (item: Request) =>
    canManageRequest(item) &&
    (item.status === 'requested' || item.status === 'rejected');
  const delivered = (id: string, workspace = data) =>
    workspace.stockMovements
      .filter((item) => item.requestId === id && item.direction === 'IN')
      .reduce((sum, item) => sum + item.quantity, 0);
  const remaining = (item: Request) =>
    Math.max(0, item.quantity - delivered(item.id));
  const filtered = data.requests.filter(
    (item) =>
      (project === 'all' || item.projectId === project) &&
      matches(
        `${label(item)} ${projectName(item.projectId)} ${supplierName(item.supplierId)}`,
      ),
  );
  const requests = filtered.filter(
    (item) => status === 'all' || item.status === status,
  );
  const lots = filtered.filter(
    (item) =>
      item.status === 'ordered' ||
      item.status === 'received' ||
      data.stockMovements.some((movement) => movement.requestId === item.id),
  );
  const suppliers = data.suppliers.filter(
    (item) =>
      (supplierFilter === 'all' ||
        (supplierFilter === 'active') === item.active) &&
      matches(`${item.name} ${item.contact} ${item.email} ${item.phone}`),
  );
  const currentRequest =
    editor && editor.kind !== 'supplier'
      ? data.requests.find((item) => item.id === editor.id)
      : undefined;
  const currentSupplier =
    editor?.kind === 'supplier'
      ? data.suppliers.find((item) => item.id === editor.id)
      : undefined;
  const historyRequest = data.requests.find((item) => item.id === history);
  const movements = data.stockMovements
    .filter((item) => item.requestId === history)
    .reverse();

  function open(value: Editor) {
    setError('');
    setEditor(value);
  }
  async function transition(item: Request, next: Request['status']) {
    const ok = await update(
      (draft) => {
        const target = draft.requests.find((value) => value.id === item.id);
        if (!target || target.status !== item.status)
          throw new Error('Request changed');
        target.status = next;
      },
      'eventUpdate',
      label(item),
    );
    if (ok) notify(p.procurementSaved);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setError('');
    const values = new FormData(event.currentTarget);
    const field = (key: string) => String(values.get(key) ?? '').trim();
    if (editor.kind === 'supplier') {
      const parsed = supplierSchema.safeParse({
        id: currentSupplier?.id ?? crypto.randomUUID(),
        name: field('name'),
        contact: field('contact'),
        email: field('email'),
        phone: field('phone'),
        notes: field('notes'),
        active: currentSupplier?.active ?? true,
      });
      if (!parsed.success) {
        setError(p.procurementInvalid);
        return;
      }
      const ok = await update(
        (draft) => {
          if (editor.id) {
            const index = draft.suppliers.findIndex(
              (item) => item.id === editor.id,
            );
            if (index < 0) throw new Error('Supplier changed');
            draft.suppliers[index] = parsed.data;
          } else draft.suppliers.push(parsed.data);
        },
        'eventUpdate',
        parsed.data.name,
      );
      if (ok) {
        setEditor(null);
        notify(p.procurementSaved);
      }
      return;
    }
    if (!currentRequest) return;
    if (editor.kind === 'draft' || editor.kind === 'order') {
      const unitPrice = Number(field('unitPrice'));
      const supplierId = field('supplierId') || undefined;
      if (
        editor.kind === 'order' &&
        (!supplierId ||
          !data.suppliers.some(
            (item) => item.id === supplierId && item.active,
          ) ||
          unitPrice <= 0)
      ) {
        setError(p.procurementSupplierRequired);
        return;
      }
      const parsed = requestSchema.safeParse({
        ...currentRequest,
        quantity:
          editor.kind === 'draft'
            ? Number(field('quantity'))
            : currentRequest.quantity,
        due: editor.kind === 'draft' ? field('due') : currentRequest.due,
        supplierId,
        unitPrice,
        status: editor.kind === 'order' ? 'ordered' : currentRequest.status,
      });
      if (!parsed.success) {
        setError(p.procurementInvalid);
        return;
      }
      const ok = await update(
        (draft) => {
          const index = draft.requests.findIndex(
            (item) => item.id === currentRequest.id,
          );
          if (
            index < 0 ||
            draft.requests[index]?.status !== currentRequest.status
          )
            throw new Error('Request changed');
          draft.requests[index] = parsed.data;
        },
        'eventUpdate',
        label(currentRequest),
      );
      if (ok) {
        setEditor(null);
        notify(p.procurementSaved);
      }
      return;
    }
    const direction = editor.kind;
    const quantity = Number(field('quantity'));
    const available =
      direction === 'IN'
        ? remaining(currentRequest)
        : stockBalance(data, currentRequest.id);
    if (quantity > available) {
      setError(p.procurementQuantityError);
      return;
    }
    const parsed = stockMovementSchema.safeParse({
      id: crypto.randomUUID(),
      projectId: currentRequest.projectId,
      requestId: currentRequest.id,
      direction,
      quantity,
      date: field('date'),
      note: field('note'),
      createdBy: actor.id,
    });
    if (!parsed.success || (direction === 'OUT' && !parsed.data.note)) {
      setError(p.procurementInvalid);
      return;
    }
    const ok = await update(
      (draft) => {
        const request = draft.requests.find(
          (item) => item.id === currentRequest.id,
        );
        if (!request) throw new Error('Request changed');
        const availableNow =
          direction === 'IN'
            ? request.quantity - delivered(request.id, draft)
            : stockBalance(draft, request.id);
        if (
          quantity > availableNow ||
          (direction === 'IN' && request.status !== 'ordered')
        )
          throw new Error('Stock changed');
        draft.stockMovements.push(parsed.data);
        if (
          direction === 'IN' &&
          delivered(request.id, draft) >= request.quantity
        )
          request.status = 'received';
      },
      'eventUpdate',
      label(currentRequest),
    );
    if (ok) {
      setEditor(null);
      notify(p.procurementSaved);
    }
  }
  async function remove() {
    if (!deletion) return;
    if (
      deletion.kind === 'supplier' &&
      data.requests.some((item) => item.supplierId === deletion.id)
    ) {
      notify(p.procurementSupplierReferenced);
      setDeletion(null);
      return;
    }
    const ok = await update(
      (draft) => {
        if (deletion.kind === 'supplier') {
          if (draft.requests.some((item) => item.supplierId === deletion.id))
            throw new Error('Supplier referenced');
          draft.suppliers = draft.suppliers.filter(
            (item) => item.id !== deletion.id,
          );
        } else {
          const request = draft.requests.find(
            (item) => item.id === deletion.id,
          );
          if (
            !request ||
            !['requested', 'rejected'].includes(request.status) ||
            draft.stockMovements.some((item) => item.requestId === request.id)
          )
            throw new Error('Historical request');
          draft.requests = draft.requests.filter(
            (item) => item.id !== deletion.id,
          );
        }
      },
      'eventDelete',
      deletion.kind === 'supplier'
        ? (data.suppliers.find((item) => item.id === deletion.id)?.name ?? '')
        : (data.requests.find((item) => item.id === deletion.id)?.name ?? ''),
    );
    if (ok) {
      setDeletion(null);
      notify(p.procurementSaved);
    }
  }
  async function archive(item: Supplier) {
    const ok = await update(
      (draft) => {
        const target = draft.suppliers.find((value) => value.id === item.id);
        if (!target) throw new Error('Supplier changed');
        target.active = !item.active;
      },
      'eventUpdate',
      item.name,
    );
    if (ok) notify(p.procurementSaved);
  }
  const editorTitle =
    editor?.kind === 'supplier'
      ? editor.id
        ? p.procurementEditSupplier
        : p.procurementNewSupplier
      : editor?.kind === 'draft'
        ? p.procurementEditDraft
        : editor?.kind === 'order'
          ? p.procurementOrder
          : editor?.kind === 'IN'
            ? p.procurementReceipt
            : p.procurementStockIssue;
  const empty = (title: string, hint = p.procurementFilterHint) => (
    <div className="panel">
      <Empty title={title} hint={hint} />
    </div>
  );

  return (
    <div className="procurement-page" aria-busy={pending}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>
            {t.procurement}
            <span className="heading-count">{data.requests.length}</span>
          </h1>
          <p>{p.procurementWorkflow}</p>
        </div>
        {tab === 'requests' && canWrite('requests') && (
          <AddButton onClick={onCreate}>{t.request}</AddButton>
        )}
        {tab === 'suppliers' && canWrite('suppliers') && (
          <AddButton onClick={() => open({ kind: 'supplier' })}>
            {p.procurementNewSupplier}
          </AddButton>
        )}
      </div>
      <div className="register-summary procurement-summary">
        {[
          {
            name: p.procurementSubmitted,
            count: data.requests.filter((item) => item.status === 'submitted')
              .length,
            icon: Package,
          },
          {
            name: p.procurementOrdered,
            count: data.requests.filter((item) => item.status === 'ordered')
              .length,
            icon: Truck,
          },
          {
            name: p.procurementSuppliers,
            count: data.suppliers.filter((item) => item.active).length,
            icon: Warehouse,
          },
        ].map((item) => (
          <div key={item.name}>
            <span className="summary-icon">
              <item.icon size={20} />
            </span>
            <span>
              {item.name}
              <strong>{item.count}</strong>
            </span>
          </div>
        ))}
      </div>
      <div className="tab-row" aria-label={t.procurement}>
        {(['requests', 'suppliers', 'stock'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            className={tab === value ? 'selected' : ''}
            onClick={() => setTab(value)}
          >
            {value === 'requests'
              ? p.procurementRequests
              : value === 'suppliers'
                ? p.procurementSuppliers
                : p.procurementStock}
          </button>
        ))}
      </div>
      <div className="toolbar procurement-toolbar">
        {tab !== 'suppliers' && (
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
        )}
        {tab === 'requests' && (
          <select
            aria-label={t.status}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">{t.all}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        )}
        {tab === 'suppliers' && (
          <select
            aria-label={p.procurementSupplier}
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
          >
            <option value="all">{p.procurementAllSuppliers}</option>
            <option value="active">{p.procurementActive}</option>
            <option value="archived">{p.procurementArchived}</option>
          </select>
        )}
      </div>
      {tab === 'requests' &&
        (requests.length ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t.material}</th>
                  <th>{t.project}</th>
                  <th>{t.quantity}</th>
                  <th>{t.due}</th>
                  <th>{p.procurementSupplier}</th>
                  <th>{t.status}</th>
                  <th>{p.procurementActions}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{label(item)}</strong>
                      <small className="procurement-subline">
                        {item.unitPrice > 0
                          ? `${money(item.unitPrice)} / ${unitLabel(item.unit, locale)}`
                          : '—'}
                      </small>
                    </td>
                    <td>{projectName(item.projectId)}</td>
                    <td className="tabular">
                      {number(item.quantity)} {unitLabel(item.unit, locale)}
                    </td>
                    <td>{date(item.due)}</td>
                    <td>{supplierName(item.supplierId)}</td>
                    <td>
                      <span
                        className={`procurement-status procurement-status-${item.status}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                      {item.status === 'ordered' && (
                        <small className="procurement-subline">
                          {p.procurementDelivered}: {number(delivered(item.id))}{' '}
                          / {number(item.quantity)}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="procurement-actions">
                        {canDraft(item) && (
                          <>
                            <button
                              className="icon-button"
                              disabled={pending}
                              aria-label={`${p.procurementEdit}: ${label(item)}`}
                              onClick={() =>
                                open({ kind: 'draft', id: item.id })
                              }
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button delete-action"
                              disabled={pending}
                              aria-label={`${t.delete}: ${label(item)}`}
                              onClick={() =>
                                setDeletion({ kind: 'request', id: item.id })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {canManageRequest(item) &&
                          item.status === 'requested' && (
                            <button
                              className="button"
                              disabled={pending}
                              onClick={() => void transition(item, 'submitted')}
                            >
                              {p.procurementSubmit}
                            </button>
                          )}
                        {canManageRequest(item) &&
                          item.status === 'rejected' && (
                            <button
                              className="button"
                              disabled={pending}
                              onClick={() => void transition(item, 'requested')}
                            >
                              {p.procurementRevise}
                            </button>
                          )}
                        {item.status === 'submitted' && canReview(item) && (
                          <>
                            <button
                              className="button primary"
                              disabled={pending}
                              onClick={() => void transition(item, 'approved')}
                            >
                              {p.procurementApprove}
                            </button>
                            <button
                              className="button"
                              disabled={pending}
                              onClick={() => void transition(item, 'rejected')}
                            >
                              {p.procurementReject}
                            </button>
                          </>
                        )}
                        {item.status === 'submitted' &&
                          canApprove(actor) &&
                          !canReview(item) && (
                            <span className="procurement-hint">
                              {p.procurementSelfReview}
                            </span>
                          )}
                        {item.status === 'approved' && canOrder && (
                          <button
                            className="button primary"
                            disabled={pending}
                            onClick={() => open({ kind: 'order', id: item.id })}
                          >
                            {p.procurementOrder}
                          </button>
                        )}
                        {item.status === 'ordered' &&
                          canWrite('stockMovements') &&
                          remaining(item) > 0 && (
                            <button
                              className="button primary"
                              disabled={pending}
                              onClick={() => open({ kind: 'IN', id: item.id })}
                            >
                              {p.procurementReceive}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          empty(
            data.requests.length
              ? p.procurementNoMatches
              : p.procurementEmptyRequests,
          )
        ))}
      {tab === 'suppliers' &&
        (suppliers.length ? (
          <div className="procurement-suppliers">
            {suppliers.map((item) => (
              <article className="panel procurement-supplier" key={item.id}>
                <div className="procurement-supplier-heading">
                  <div>
                    <h2>{item.name}</h2>
                    <span
                      className={`procurement-status ${item.active ? 'procurement-status-approved' : ''}`}
                    >
                      {item.active
                        ? p.procurementActive
                        : p.procurementArchived}
                    </span>
                  </div>
                  {canWrite('suppliers') && (
                    <button
                      className="icon-button"
                      disabled={pending}
                      aria-label={`${p.procurementEdit}: ${item.name}`}
                      onClick={() => open({ kind: 'supplier', id: item.id })}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                <dl>
                  <div>
                    <dt>{p.procurementContact}</dt>
                    <dd>{item.contact || '—'}</dd>
                  </div>
                  <div>
                    <dt>{p.procurementPhone}</dt>
                    <dd>{item.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt>{p.procurementEmail}</dt>
                    <dd>{item.email || '—'}</dd>
                  </div>
                </dl>
                {item.notes && (
                  <p className="procurement-supplier-notes">{item.notes}</p>
                )}
                {canWrite('suppliers') && (
                  <div className="procurement-actions">
                    <button
                      className="button"
                      disabled={pending}
                      onClick={() => void archive(item)}
                    >
                      {item.active
                        ? p.procurementArchive
                        : p.procurementRestore}
                    </button>
                    {!data.requests.some(
                      (request) => request.supplierId === item.id,
                    ) && (
                      <button
                        className="icon-button delete-action"
                        disabled={pending}
                        aria-label={`${t.delete}: ${item.name}`}
                        onClick={() =>
                          setDeletion({ kind: 'supplier', id: item.id })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          empty(p.procurementEmptySuppliers)
        ))}
      {tab === 'stock' && (
        <>
          <p className="info-note">{p.procurementLotHint}</p>
          {lots.length ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t.material}</th>
                    <th>{t.project}</th>
                    <th>{p.procurementDelivered}</th>
                    <th>{p.procurementIssued}</th>
                    <th>{p.procurementBalance}</th>
                    <th>{p.procurementRemaining}</th>
                    <th>{p.procurementActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((item) => {
                    const balance = stockBalance(data, item.id);
                    const received = delivered(item.id);
                    const unit = unitLabel(item.unit, locale);
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{label(item)}</strong>
                          <small className="procurement-subline">
                            {supplierName(item.supplierId)} · {date(item.due)}
                          </small>
                        </td>
                        <td>{projectName(item.projectId)}</td>
                        <td>
                          {number(received)} {unit}
                        </td>
                        <td>
                          {number(received - balance)} {unit}
                        </td>
                        <td>
                          <strong>
                            {number(balance)} {unit}
                          </strong>
                        </td>
                        <td>
                          {number(remaining(item))} {unit}
                        </td>
                        <td>
                          <div className="procurement-actions">
                            {canWrite('stockMovements') &&
                              item.status === 'ordered' &&
                              remaining(item) > 0 && (
                                <button
                                  className="button"
                                  disabled={pending}
                                  onClick={() =>
                                    open({ kind: 'IN', id: item.id })
                                  }
                                >
                                  {p.procurementReceive}
                                </button>
                              )}
                            {canWrite('stockMovements') && balance > 0 && (
                              <button
                                className="button"
                                disabled={pending}
                                onClick={() =>
                                  open({ kind: 'OUT', id: item.id })
                                }
                              >
                                {p.procurementIssue}
                              </button>
                            )}
                            <button
                              className="button"
                              onClick={() => setHistory(item.id)}
                            >
                              {p.procurementHistory}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            empty(p.procurementEmptyStock, p.procurementStockHint)
          )}
        </>
      )}
      <Modal
        open={!!editor}
        onClose={() => {
          if (!pending) setEditor(null);
        }}
        title={editorTitle}
      >
        {editor && (
          <form
            className="record-form procurement-form"
            key={`${editor.kind}-${editor.id ?? 'new'}`}
            onSubmit={(event) => void save(event)}
          >
            {editor.kind === 'supplier' ? (
              <>
                {(['name', 'contact', 'email', 'phone', 'notes'] as const).map(
                  (field) => (
                    <label key={field}>
                      {
                        {
                          name: p.procurementName,
                          contact: p.procurementContact,
                          email: p.procurementEmail,
                          phone: p.procurementPhone,
                          notes: p.procurementNotes,
                        }[field]
                      }
                      {field === 'notes' ? (
                        <textarea
                          name={field}
                          maxLength={2000}
                          defaultValue={currentSupplier?.[field] ?? ''}
                          rows={3}
                        />
                      ) : (
                        <input
                          name={field}
                          type={
                            field === 'email'
                              ? 'email'
                              : field === 'phone'
                                ? 'tel'
                                : 'text'
                          }
                          minLength={field === 'name' ? 2 : undefined}
                          maxLength={field === 'phone' ? 50 : 200}
                          required={field === 'name'}
                          defaultValue={currentSupplier?.[field] ?? ''}
                        />
                      )}
                    </label>
                  ),
                )}
              </>
            ) : (
              currentRequest && (
                <>
                  <div className="procurement-form-summary">
                    <strong>{label(currentRequest)}</strong>
                    <span>
                      {projectName(currentRequest.projectId)} ·{' '}
                      {number(currentRequest.quantity)}{' '}
                      {unitLabel(currentRequest.unit, locale)}
                    </span>
                  </div>
                  {editor.kind === 'draft' || editor.kind === 'order' ? (
                    <>
                      {editor.kind === 'draft' && (
                        <>
                          <label>
                            {t.quantity}
                            <input
                              name="quantity"
                              type="number"
                              min="0.000001"
                              max="1000000000"
                              step="any"
                              required
                              defaultValue={currentRequest.quantity}
                            />
                          </label>
                          <label>
                            {t.due}
                            <input
                              name="due"
                              type="date"
                              required
                              defaultValue={currentRequest.due}
                            />
                          </label>
                        </>
                      )}
                      <label>
                        {p.procurementSupplier}
                        <select
                          name="supplierId"
                          required={editor.kind === 'order'}
                          defaultValue={currentRequest.supplierId ?? ''}
                        >
                          <option value="">{p.procurementNoSupplier}</option>
                          {data.suppliers
                            .filter(
                              (item) =>
                                item.active ||
                                (editor.kind === 'draft' &&
                                  item.id === currentRequest.supplierId),
                            )
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                                {!item.active
                                  ? ` (${p.procurementArchived})`
                                  : ''}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        {p.procurementUnitPrice}
                        <input
                          name="unitPrice"
                          type="number"
                          min={editor.kind === 'order' ? 1 : 0}
                          max="100000000000"
                          step="1"
                          required
                          defaultValue={currentRequest.unitPrice}
                        />
                      </label>
                      {editor.kind === 'order' && (
                        <p className="form-hint">
                          {p.procurementSupplierRequired}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="form-hint">
                        {editor.kind === 'IN'
                          ? p.procurementReceiptHint
                          : p.procurementIssueHint}{' '}
                        {editor.kind === 'IN'
                          ? p.procurementRemaining
                          : p.procurementBalance}
                        :{' '}
                        {number(
                          editor.kind === 'IN'
                            ? remaining(currentRequest)
                            : stockBalance(data, currentRequest.id),
                        )}{' '}
                        {unitLabel(currentRequest.unit, locale)}
                      </p>
                      <label>
                        {t.quantity}
                        <input
                          name="quantity"
                          type="number"
                          min="0.000001"
                          max={
                            editor.kind === 'IN'
                              ? remaining(currentRequest)
                              : stockBalance(data, currentRequest.id)
                          }
                          step="any"
                          required
                        />
                      </label>
                      <label>
                        {p.procurementMovementDate}
                        <input
                          name="date"
                          type="date"
                          required
                          defaultValue={dateKey()}
                        />
                      </label>
                      <label className="procurement-wide">
                        {p.procurementNotes}
                        <textarea
                          name="note"
                          rows={3}
                          maxLength={1000}
                          required={editor.kind === 'OUT'}
                        />
                      </label>
                    </>
                  )}
                </>
              )
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={() => setEditor(null)}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={pending}
              >
                {pending
                  ? t.saving
                  : editor.kind === 'order'
                    ? p.procurementOrder
                    : t.save}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!deletion}
        onClose={() => {
          if (!pending) setDeletion(null);
        }}
        title={p.procurementDeleteTitle}
      >
        <div className="procurement-confirm">
          <strong>
            {deletion?.kind === 'request'
              ? data.requests.find((item) => item.id === deletion.id)?.name
              : data.suppliers.find((item) => item.id === deletion?.id)?.name}
          </strong>
          <p>{p.procurementDeleteHint}</p>
          <div className="form-actions">
            <button
              className="button"
              disabled={pending}
              onClick={() => setDeletion(null)}
            >
              {t.cancel}
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => void remove()}
            >
              {pending ? t.saving : t.delete}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={!!historyRequest}
        onClose={() => setHistory(null)}
        title={p.procurementHistory}
      >
        <div className="procurement-history">
          <h3>{historyRequest && label(historyRequest)}</h3>
          {movements.length ? (
            <ol>
              {movements.map((item) => (
                <li key={item.id}>
                  <div>
                    <span
                      className={`procurement-status ${item.direction === 'IN' ? 'procurement-status-approved' : ''}`}
                    >
                      {item.direction === 'IN'
                        ? p.procurementIn
                        : p.procurementOut}
                    </span>
                    <strong>
                      {item.direction === 'IN' ? '+' : '−'}
                      {number(item.quantity)}{' '}
                      {historyRequest && unitLabel(historyRequest.unit, locale)}
                    </strong>
                    <time dateTime={item.date}>{date(item.date)}</time>
                  </div>
                  {item.note && <p>{item.note}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p>{p.procurementNoHistory}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
