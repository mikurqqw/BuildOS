import { useState } from 'react';
import {
  Package,
  Trash2,
  Clock3,
  CheckCheck,
  ArrowUpRight,
} from 'lucide-react';
import { dateKey } from '@buildos/shared';
import { useI18n } from '../i18n/context';
import { useWorkspace } from '../data/workspace';
import { AddButton, Empty, Status, Modal } from '../components/ui';
export function Registers({
  search,
  onCreate,
}: {
  kind: 'procurement';
  search: string;
  onCreate: () => void;
}) {
  const { t, date } = useI18n();
  const { data, update, notify, pending } = useWorkspace();
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const selected = data.requests.find((item) => item.id === deleting);
  const requests = data.requests.filter(
    (item) =>
      (filter === 'all' || item.status === filter) &&
      item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  async function remove() {
    if (!selected) return;
    const ok = await update(
      (draft) => {
        draft.requests = draft.requests.filter(
          (item) => item.id !== selected.id,
        );
      },
      'eventDelete',
      selected.name,
    );
    if (ok) {
      setDeleting(null);
      notify(t.requestDeleted);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>
            {t.procurement}
            <span className="heading-count">{data.requests.length}</span>
          </h1>
          <p>{t.procurementSub}</p>
        </div>
        <AddButton onClick={onCreate}>{t.request}</AddButton>
      </div>
      <div className="register-summary">
        {[
          { label: t.total, value: data.requests.length, icon: Package },
          {
            label: t.requested,
            value: data.requests.filter((item) => item.status === 'requested')
              .length,
            icon: Clock3,
          },
          {
            label: t.received,
            value: data.requests.filter((item) => item.status === 'received')
              .length,
            icon: CheckCheck,
          },
        ].map((item) => (
          <div key={item.label}>
            <span className="summary-icon">
              <item.icon size={19} />
            </span>
            <span>
              {item.label}
              <strong>{item.value}</strong>
            </span>
            <ArrowUpRight size={15} />
          </div>
        ))}
      </div>
      <div className="tab-row">
        {(['all', 'requested', 'received'] as const).map((value) => (
          <button
            className={filter === value ? 'selected' : ''}
            key={value}
            onClick={() => setFilter(value)}
          >
            {t[value]}
          </button>
        ))}
      </div>
      {requests.length ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.material}</th>
                <th>{t.project}</th>
                <th>{t.quantity}</th>
                <th>{t.due}</th>
                <th>{t.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="task-title">
                      <span className="table-resource-icon">
                        <Package size={18} />
                      </span>
                      <strong>{item.name}</strong>
                    </div>
                  </td>
                  <td>
                    {
                      data.projects.find(
                        (project) => project.id === item.projectId,
                      )?.name
                    }
                  </td>
                  <td className="tabular">
                    {new Intl.NumberFormat('ru-KZ').format(item.quantity)}{' '}
                    {item.unit}
                  </td>
                  <td>
                    <span
                      className={
                        item.status === 'requested' && item.due < dateKey()
                          ? 'danger-text'
                          : ''
                      }
                    >
                      {date(item.due)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="status-button"
                      disabled={pending}
                      aria-label={`${item.status === 'received' ? t.requested : t.received}: ${item.name}`}
                      onClick={() =>
                        void update(
                          (draft) => {
                            const request = draft.requests.find(
                              (request) => request.id === item.id,
                            );
                            if (request)
                              request.status =
                                item.status === 'received'
                                  ? 'requested'
                                  : 'received';
                          },
                          'eventUpdate',
                          item.name,
                        )
                      }
                    >
                      <Status value={item.status} />
                    </button>
                  </td>
                  <td>
                    <button
                      className="icon-button delete-action"
                      aria-label={`${t.delete}: ${item.name}`}
                      onClick={() => setDeleting(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel">
          <Empty
            action={<AddButton onClick={onCreate}>{t.request}</AddButton>}
          />
        </div>
      )}
      <Modal
        open={!!selected}
        onClose={() => setDeleting(null)}
        title={t.deleteRequestTitle}
      >
        <div className="delete-request-content">
          <span className="delete-illustration">
            <Trash2 size={25} />
          </span>
          <h3>{selected?.name}</h3>
          <p>{t.deleteRequestHint}</p>
          <div className="form-actions">
            <button className="button" onClick={() => setDeleting(null)}>
              {t.cancel}
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={() => void remove()}
            >
              <Trash2 size={16} />
              {pending ? t.saving : t.delete}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
