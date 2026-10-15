import { useRef, useState } from 'react';
import { Upload, Download, Trash2, History } from 'lucide-react';
import {
  canApprove,
  documentSchema,
  fileKey,
  type Workspace,
} from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { docsMessages } from '../i18n/operations-docs';
import { saveFile, readFile, downloadBlob, deleteFile } from '../data/files';
import { Empty, Modal } from '../components/ui';
import { useAuth } from '../auth/context';
import { api, apiBlob } from '../data/api';
import { z } from 'zod';
type Document = Workspace['documents'][number];
const series = (item: Document) => item.seriesId ?? item.id;
const allowed = /\.(pdf|png|jpg|jpeg|webp|docx|xlsx|txt)$/i;
export function Documents({ search }: { search: string }) {
  const { t, date, locale } = useI18n();
  const d = docsMessages[locale];
  const { data, demo, update, notify, actor, canWrite, pending } =
    useWorkspace();
  const { session } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState('');
  const [versionOf, setVersionOf] = useState('');
  const [history, setHistory] = useState('');
  const [reviewId, setReviewId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const writable = canWrite('documents');
  const latestBySeries = new Map<string, Document>();
  for (const item of data.documents) {
    const previous = latestBySeries.get(series(item));
    if (!previous || item.version > previous.version)
      latestBySeries.set(series(item), item);
  }
  const latest = [...latestBySeries.values()];
  const documents = latest.filter(
    (item) =>
      (!project || item.projectId === project) &&
      item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const status = {
    draft: d.dfDraft,
    pending: d.dfPending,
    approved: d.dfApproved,
    rejected: d.dfRejected,
  };
  async function deleteContent(id: string) {
    if (demo) await deleteFile(fileKey(id, true));
    else
      await api(
        `/files/${encodeURIComponent(id)}`,
        z.object({ ok: z.boolean() }),
        {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': session?.csrfToken ?? '' },
        },
      );
  }
  async function upload(file: File) {
    const previous = data.documents.find((item) => series(item) === versionOf);
    const projectId = previous?.projectId ?? project;
    if (
      !writable ||
      !projectId ||
      !allowed.test(file.name) ||
      file.size > 20 * 1024 * 1024
    ) {
      notify(t.fileError);
      return;
    }
    setLoading(true);
    let metadata = documentSchema.parse({
      projectId,
      name: file.name,
      size: file.size,
      mime: file.type,
      createdAt: new Date().toISOString(),
    });
    let uploaded = false;
    let attached = false;
    try {
      if (demo) await saveFile(fileKey(metadata.id, true), file);
      else {
        const body = new FormData();
        body.append('file', file);
        metadata = await api(
          `/files?projectId=${encodeURIComponent(projectId)}`,
          documentSchema,
          {
            method: 'POST',
            body,
            headers: { 'X-CSRF-Token': session?.csrfToken ?? '' },
          },
        );
      }
      uploaded = true;
      metadata = documentSchema.parse({
        ...metadata,
        seriesId: previous ? series(previous) : metadata.id,
        version: previous
          ? Math.max(
              ...data.documents
                .filter((item) => series(item) === series(previous))
                .map((item) => item.version),
            ) + 1
          : 1,
        reviewStatus: 'draft',
        reviewNote: '',
        submittedBy: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
      });
      attached = await update(
        (draft) => {
          draft.documents.push(metadata);
        },
        'eventDocument',
        file.name,
      );
    } catch {
      notify(t.fileError);
    } finally {
      if (uploaded && !attached) {
        try {
          await deleteContent(metadata.id);
        } catch {
          notify(t.fileError);
        }
      }
      setLoading(false);
      if (input.current) input.current.value = '';
    }
  }
  async function download(item: Document) {
    try {
      downloadBlob(
        demo
          ? await readFile(fileKey(item.id, true))
          : await apiBlob(`/files/${encodeURIComponent(item.id)}`),
        item.name,
      );
    } catch {
      notify(demo ? d.dfMissingFile : t.fileError);
    }
  }
  async function remove(item: Document) {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      if (
        await update(
          (draft) => {
            draft.documents = draft.documents.filter(
              (record) => record.id !== item.id,
            );
          },
          'eventDelete',
          item.name,
        )
      )
        await deleteContent(item.id);
    } catch {
      notify(t.fileError);
    }
  }
  async function transition(item: Document, next: Document['reviewStatus']) {
    if (next === 'rejected' && !reviewNote.trim()) {
      notify(d.dfRejectReason);
      return;
    }
    const ok = await update(
      (draft) => {
        const record = draft.documents.find((value) => value.id === item.id);
        if (record) {
          record.reviewStatus = next;
          record.reviewNote = next === 'pending' ? '' : reviewNote.trim();
        }
      },
      'eventDocument',
      item.name,
    );
    if (ok) {
      setReviewId('');
      setReviewNote('');
    }
  }
  const review = data.documents.find((item) => item.id === reviewId);
  function actions(item: Document, isLatest: boolean) {
    const reviewable =
      item.reviewStatus === 'pending' &&
      canApprove(actor) &&
      (actor.role === 'OWNER' || item.submittedBy !== actor.id);
    return (
      <div className="button-row df-actions">
        <button
          className="icon-button"
          aria-label={`${t.download}: ${item.name}`}
          onClick={() => void download(item)}
        >
          <Download size={17} />
        </button>
        {isLatest && (
          <button
            className="icon-button"
            aria-label={`${d.dfHistory}: ${item.name}`}
            onClick={() => setHistory(series(item))}
          >
            <History size={17} />
          </button>
        )}
        {writable && item.reviewStatus === 'draft' && (
          <button
            className="button"
            disabled={pending}
            onClick={() => void transition(item, 'pending')}
          >
            {d.dfSubmit}
          </button>
        )}
        {reviewable && (
          <button
            className="button"
            disabled={pending}
            onClick={() => {
              setReviewId(item.id);
              setReviewNote('');
            }}
          >
            {d.dfReviewNote}
          </button>
        )}
        {writable && isLatest && item.reviewStatus === 'draft' && (
          <button
            className="icon-button"
            disabled={pending}
            aria-label={`${t.delete}: ${item.name}`}
            onClick={() => void remove(item)}
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.construction}</div>
          <h1>
            {t.documents}
            <span className="heading-count">{documents.length}</span>
          </h1>
          <p>{demo ? t.fileLocal : t.serverFiles}</p>
        </div>
      </div>
      {writable ? (
        <div className="upload-zone df-upload">
          <span className="empty-icon">
            <Upload size={27} />
          </span>
          <div>
            <h3>{t.upload}</h3>
            <p>PDF, DOCX, XLSX, TXT, PNG, JPG, WEBP · ≤ 20 MB</p>
          </div>
          <select
            aria-label={t.project}
            value={project}
            onChange={(event) => {
              setProject(event.target.value);
              setVersionOf('');
            }}
          >
            <option value="">{t.project}</option>
            {data.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            aria-label={d.dfNewVersion}
            value={versionOf}
            onChange={(event) => setVersionOf(event.target.value)}
          >
            <option value="">{d.dfNewSeries}</option>
            {latest
              .filter((item) => item.projectId === project)
              .map((item) => (
                <option key={item.id} value={series(item)}>
                  {d.dfNewVersion}: {item.name}
                </option>
              ))}
          </select>
          <button
            className="button primary"
            disabled={!project || loading || pending}
            onClick={() => input.current?.click()}
          >
            <Upload size={17} />
            {loading ? d.dfSaving : t.upload}
          </button>
          <input
            hidden
            type="file"
            ref={input}
            accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
      ) : (
        <p className="info-note">{d.dfReadOnly}</p>
      )}
      <div className="toolbar">
        <select
          aria-label={t.projectFilter}
          value={project}
          onChange={(event) => {
            setProject(event.target.value);
            setVersionOf('');
          }}
        >
          <option value="">{t.projectFilter}</option>
          {data.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {demo && <p className="form-hint">{t.demoHint}</p>}
      {documents.length ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.fileName}</th>
                <th>{t.project}</th>
                <th>{d.dfVersion}</th>
                <th>{d.dfStatus}</th>
                <th>{t.uploaded}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {documents.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small>{(item.size / 1024).toFixed(1)} KB</small>
                  </td>
                  <td>
                    {
                      data.projects.find((value) => value.id === item.projectId)
                        ?.name
                    }
                  </td>
                  <td>{item.version}</td>
                  <td>
                    <span className={`status status-${item.reviewStatus}`}>
                      {status[item.reviewStatus]}
                    </span>
                  </td>
                  <td>{date(item.createdAt)}</td>
                  <td>{actions(item, true)}</td>
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
        open={!!history}
        onClose={() => setHistory('')}
        title={d.dfHistory}
      >
        <p className="form-hint">{d.dfHistoryHint}</p>
        <div className="df-history">
          {data.documents
            .filter((item) => series(item) === history)
            .sort((a, b) => b.version - a.version)
            .map((item) => (
              <article key={item.id} className="df-version">
                <strong>
                  {d.dfVersion} {item.version} · {item.name}
                </strong>
                <p>
                  {date(item.createdAt)} · {status[item.reviewStatus]}
                </p>
                {item.reviewedAt && (
                  <p>
                    {d.dfReviewed}: {date(item.reviewedAt)}
                  </p>
                )}
                {item.reviewNote && <p>{item.reviewNote}</p>}
                {actions(
                  item,
                  latest.some((value) => value.id === item.id),
                )}
              </article>
            ))}
        </div>
      </Modal>
      <Modal
        open={!!review}
        onClose={() => setReviewId('')}
        title={d.dfReviewNote}
      >
        <form
          className="df-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (review) void transition(review, 'approved');
          }}
        >
          <label>
            {d.dfReviewNote}
            <textarea
              maxLength={1000}
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="button primary" disabled={pending}>
              {d.dfApprove}
            </button>
            <button
              type="button"
              className="button"
              disabled={pending || !reviewNote.trim()}
              onClick={() => {
                if (review) void transition(review, 'rejected');
              }}
            >
              {d.dfReject}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
