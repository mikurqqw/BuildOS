import { useRef, useState } from 'react';
import { Upload, FileText, Download, Trash2, LoaderCircle } from 'lucide-react';
import { documentSchema, fileKey } from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { saveFile, readFile, downloadBlob, deleteFile } from '../data/files';
import { Empty } from '../components/ui';
import { useAuth } from '../auth/context';
import { api, apiBlob } from '../data/api';
import { z } from 'zod';
const allowed = /\.(pdf|png|jpg|jpeg|webp|docx|xlsx|txt)$/i;
export function Documents({ search }: { search: string }) {
  const { t, date } = useI18n();
  const { data, demo, update, notify } = useWorkspace();
  const { session } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState('');
  const [loading, setLoading] = useState(false);
  const documents = data.documents.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  async function upload(file: File) {
    if (!project || !allowed.test(file.name) || file.size > 20 * 1024 * 1024) {
      notify(t.fileError);
      return;
    }
    setLoading(true);
    let metadata = documentSchema.parse({
      projectId: project,
      name: file.name,
      size: file.size,
      mime: file.type,
      createdAt: new Date().toISOString(),
    });
    try {
      if (demo) await saveFile(fileKey(metadata.id, true), file);
      else {
        const body = new FormData();
        body.append('file', file);
        metadata = await api(
          `/files?projectId=${encodeURIComponent(project)}`,
          documentSchema,
          {
            method: 'POST',
            body,
            headers: { 'X-CSRF-Token': session?.csrfToken ?? '' },
          },
        );
      }
      if (
        !(await update(
          (draft) => {
            draft.documents.push(metadata);
          },
          'eventDocument',
          file.name,
        ))
      ) {
        if (demo) await deleteFile(fileKey(metadata.id, true));
        else
          await api(`/files/${metadata.id}`, z.object({ ok: z.boolean() }), {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': session?.csrfToken ?? '' },
          });
      }
    } catch {
      notify(t.fileError);
    } finally {
      setLoading(false);
      if (input.current) input.current.value = '';
    }
  }
  async function download(id: string, name: string) {
    try {
      downloadBlob(
        demo
          ? await readFile(fileKey(id, true))
          : await apiBlob(`/files/${encodeURIComponent(id)}`),
        name,
      );
    } catch {
      notify(t.fileError);
    }
  }
  async function remove(id: string, name: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      if (
        await update(
          (draft) => {
            draft.documents = draft.documents.filter((item) => item.id !== id);
          },
          'eventDelete',
          name,
        )
      ) {
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
    } catch {
      notify(t.fileError);
    }
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
      <div className="upload-zone">
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
          onChange={(event) => setProject(event.target.value)}
        >
          <option value="">{t.project}</option>
          {data.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          className="button primary"
          disabled={!project || loading}
          onClick={() => input.current?.click()}
        >
          {loading ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Upload size={17} />
          )}{' '}
          {t.upload}
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
      {demo && <p className="form-hint">{t.demoHint}</p>}
      {documents.length ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.fileName}</th>
                <th>{t.project}</th>
                <th>{t.size}</th>
                <th>{t.uploaded}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {documents.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="task-title">
                      <FileText size={19} />
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
                  <td>{(item.size / 1024).toFixed(1)} KB</td>
                  <td>{date(item.createdAt)}</td>
                  <td>
                    <div className="button-row">
                      <button
                        className="icon-button"
                        aria-label={`${t.download}: ${item.name}`}
                        onClick={() => void download(item.id, item.name)}
                      >
                        <Download size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`${t.delete}: ${item.name}`}
                        onClick={() => void remove(item.id, item.name)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
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
    </>
  );
}
