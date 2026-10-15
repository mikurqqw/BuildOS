import { dateKey } from '@buildos/shared';
import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { taskSchema, type Task } from '@buildos/shared';
import {
  LayoutList,
  Columns3,
  CheckSquare,
  Trash2,
  CalendarDays,
} from 'lucide-react';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { AddButton, Empty, Status } from '../components/ui';
import {
  TaskPlanningDialog,
  TaskPlanningSummary,
} from '../components/Planning';
import { planningMessages } from '../i18n/operations-planning';
const statuses = [
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
] as const;
export function Tasks({
  search,
  onCreate,
  projectId,
}: {
  search: string;
  onCreate: () => void;
  projectId?: string;
}) {
  const { t, date, locale } = useI18n();
  const p = planningMessages[locale];
  const { data, update, notify, pending, canWrite } = useWorkspace();
  const [planning, setPlanning] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [status, setStatus] = useState('all');
  const [project, setProject] = useState('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [boardLimit, setBoardLimit] = useState(30);
  const tasks = data.tasks.filter(
    (task) =>
      (!projectId || task.projectId === projectId) &&
      (project === 'all' || task.projectId === project) &&
      (status === 'all' || task.status === status) &&
      `${task.title} ${task.assignee}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  async function change(task: Task, value: string) {
    const parsed = taskSchema.shape.status.safeParse(value);
    if (
      parsed.success &&
      (await update(
        (draft) => {
          const record = draft.tasks.find((item) => item.id === task.id);
          if (record) record.status = parsed.data;
        },
        'eventUpdate',
        task.title,
      ))
    )
      notify(t.saved);
  }
  async function remove(task: Task) {
    if (window.confirm(t.deleteConfirm))
      await update(
        (draft) => {
          draft.tasks = draft.tasks.filter((item) => item.id !== task.id);
        },
        'eventDelete',
        task.title,
      );
  }
  const statusSelect = (task: Task) => (
    <select
      className="inline-select"
      aria-label={`${t.status}: ${task.title}`}
      value={task.status}
      disabled={pending || !canWrite('tasks')}
      onChange={(event) => change(task, event.target.value)}
    >
      {statuses.map((value) => (
        <option
          key={value}
          value={value}
          disabled={
            ['IN_PROGRESS', 'DONE'].includes(value) &&
            task.dependsOn.some(
              (id) =>
                data.tasks.find((item) => item.id === id)?.status !== 'DONE',
            )
          }
        >
          {t[value]}
        </option>
      ))}
    </select>
  );
  const helper = createColumnHelper<Task>();
  const columns = [
    helper.accessor('title', {
      header: t.title,
      cell: (info) => (
        <div>
          <div className="task-title">
            <CheckSquare size={16} />
            <strong>{info.getValue()}</strong>
          </div>
          <TaskPlanningSummary task={info.row.original} />
        </div>
      ),
    }),
    helper.accessor('projectId', {
      header: t.project,
      cell: (info) =>
        data.projects.find((item) => item.id === info.getValue())?.name || '—',
    }),
    helper.accessor('assignee', {
      header: t.assignee,
      cell: (info) => info.getValue() || '—',
    }),
    helper.accessor('due', {
      header: t.due,
      cell: (info) => (
        <span
          className={
            info.getValue() < dateKey() &&
            !['DONE', 'CANCELLED'].includes(info.row.original.status)
              ? 'danger-text'
              : ''
          }
        >
          {date(info.getValue())}
        </span>
      ),
    }),
    helper.accessor('priority', {
      header: t.priority,
      cell: (info) => <Status value={info.getValue()} />,
    }),
    helper.accessor('status', {
      header: t.status,
      cell: (info) => statusSelect(info.row.original),
    }),
    helper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <div className="planning-actions">
          <button
            className="icon-button"
            disabled={pending || !canWrite('tasks')}
            aria-label={`${p.planning}: ${info.row.original.title}`}
            onClick={() => setPlanning(info.row.original.id)}
          >
            <CalendarDays size={16} />
          </button>
          <button
            className="icon-button"
            disabled={
              pending ||
              !canWrite('tasks') ||
              data.tasks.some((item) =>
                item.dependsOn.includes(info.row.original.id),
              )
            }
            aria-label={`${t.delete}: ${info.row.original.title}`}
            onClick={() => remove(info.row.original)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    }),
  ];
  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        ...pagination,
        pageIndex: Math.min(
          pagination.pageIndex,
          Math.max(0, Math.ceil(tasks.length / pagination.pageSize) - 1),
        ),
      },
    },
    onPaginationChange: setPagination,
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.construction}</div>
          <h1>
            {t.tasks}
            <span className="heading-count">{tasks.length}</span>
          </h1>
          <p>{t.progressMethod}</p>
        </div>
        {canWrite('tasks') && (
          <AddButton onClick={onCreate}>{t.newTask}</AddButton>
        )}
      </div>
      <div className="toolbar">
        <div className="segmented">
          <button
            className={view === 'list' ? 'selected' : ''}
            onClick={() => setView('list')}
          >
            <LayoutList size={16} />
            {t.taskList}
          </button>
          <button
            className={view === 'board' ? 'selected' : ''}
            onClick={() => setView('board')}
          >
            <Columns3 size={16} />
            {t.kanban}
          </button>
        </div>
        <div className="toolbar-filters">
          <select
            aria-label={t.filter}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              table.setPageIndex(0);
            }}
          >
            <option value="all">{t.all}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {t[value]}
              </option>
            ))}
          </select>
          {!projectId && (
            <select
              aria-label={t.project}
              value={project}
              onChange={(event) => {
                setProject(event.target.value);
                table.setPageIndex(0);
              }}
            >
              <option value="all">{t.projectFilter}</option>
              {data.projects.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {!tasks.length ? (
        <div className="panel">
          <Empty
            title={data.tasks.length ? t.noResults : t.empty}
            action={
              canWrite('tasks') ? (
                <AddButton onClick={onCreate}>{t.newTask}</AddButton>
              ) : undefined
            }
          />
        </div>
      ) : view === 'list' ? (
        <div className="table-container">
          <table>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <span>
              {t.page} {table.getState().pagination.pageIndex + 1} /{' '}
              {Math.max(1, table.getPageCount())}
            </span>
            <button
              className="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              {t.previous}
            </button>
            <button
              className="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              {t.next}
            </button>
          </div>
        </div>
      ) : (
        <div className="kanban">
          {statuses
            .filter((value) => value !== 'CANCELLED')
            .map((value) => (
              <section className="kanban-column" key={value}>
                <h3>
                  {t[value]}
                  <span className="count">
                    {tasks.filter((task) => task.status === value).length}
                  </span>
                </h3>
                {tasks
                  .filter((task) => task.status === value)
                  .slice(0, boardLimit)
                  .map((task) => (
                    <article className="kanban-card" key={task.id}>
                      <Status value={task.priority} />
                      <h4>{task.title}</h4>
                      <p>
                        {
                          data.projects.find(
                            (item) => item.id === task.projectId,
                          )?.name
                        }
                      </p>
                      <div>
                        {task.assignee || '—'} · {date(task.due)}
                      </div>
                      {statusSelect(task)}
                      <TaskPlanningSummary task={task} />
                      <button
                        className="button planning-board-button"
                        disabled={pending || !canWrite('tasks')}
                        onClick={() => setPlanning(task.id)}
                      >
                        <CalendarDays size={15} />
                        {p.planning}
                      </button>
                    </article>
                  ))}
                {tasks.filter((task) => task.status === value).length >
                  boardLimit && (
                  <button
                    className="text-button"
                    onClick={() => setBoardLimit((value) => value + 30)}
                  >
                    {t.showMore}
                  </button>
                )}
              </section>
            ))}
        </div>
      )}
      <TaskPlanningDialog taskId={planning} onClose={() => setPlanning(null)} />
    </>
  );
}
