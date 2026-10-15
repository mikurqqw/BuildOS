import { dateKey, workspaceSchema } from '@buildos/shared';
import { useRef, useState } from 'react';
import {
  Download,
  Upload,
  Sun,
  Moon,
  Globe2,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { useI18n, type Locale } from '../i18n/context';
import { useWorkspace } from '../data/workspace';
import { downloadBlob, readFile } from '../data/files';
export function Settings() {
  const { t, locale, setLocale, theme, toggleTheme } = useI18n();
  const { data, restore, notify, demo, setDemo } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [legacy] = useState(() => {
    try {
      return (
        workspaceSchema.safeParse(
          JSON.parse(localStorage.getItem('buildos-workspace-v1') ?? 'null'),
        ).data ?? null
      );
    } catch {
      return null;
    }
  });
  async function downloadLegacy(id: string, name: string) {
    try {
      downloadBlob(await readFile(id), name);
    } catch {
      notify(t.fileError);
    }
  }
  async function importFile(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      notify(t.invalidImport);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (window.confirm(t.importConfirm)) await restore(parsed);
    } catch {
      notify(t.invalidImport);
    } finally {
      if (input.current) input.current.value = '';
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.workspace}</div>
          <h1>{t.settings}</h1>
          <p>{t.settingsSub}</p>
        </div>
      </div>
      {legacy && !demo && (
        <section className="panel settings-panel" style={{ marginTop: 22 }}>
          <h2>{t.legacyData}</h2>
          <p>{t.legacyHint}</p>
          <div className="button-row">
            {legacy.documents.map((document) => (
              <button
                className="button"
                key={document.id}
                onClick={() => void downloadLegacy(document.id, document.name)}
              >
                <Download size={16} />
                {document.name}
              </button>
            ))}
          </div>
          <button
            className="button"
            onClick={() => {
              if (window.confirm(t.importConfirm))
                void restore({ ...legacy, documents: [] });
            }}
          >
            {t.importLegacy}
          </button>
        </section>
      )}
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>
            <Sun size={20} />
            {t.appearance}
          </h2>
          <div className="theme-options">
            {(['light', 'dark'] as const).map((value) => (
              <button
                className={`theme-option ${theme === value ? 'selected' : ''}`}
                key={value}
                onClick={() => {
                  if (theme !== value) toggleTheme();
                }}
              >
                <div className={`theme-preview ${value}`}>
                  <span />
                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <strong>
                  {value === 'light' ? <Sun size={16} /> : <Moon size={16} />}{' '}
                  {t[value]}
                  <span className="radio-indicator" />
                </strong>
              </button>
            ))}
          </div>
        </section>
        <section className="panel settings-panel">
          <h2>
            <Globe2 size={20} />
            {t.language}
          </h2>
          <div className="language-options">
            {(
              [
                { value: 'ru', name: 'Русский', code: 'RU' },
                { value: 'kk', name: 'Қазақша', code: 'KZ' },
                { value: 'en', name: 'English', code: 'EN' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                className={locale === item.value ? 'selected' : ''}
                onClick={() => setLocale(item.value as Locale)}
              >
                <span>{item.code}</span>
                <strong>{item.name}</strong>
                <span className="radio-indicator" />
              </button>
            ))}
          </div>
        </section>
        <section className="panel settings-panel settings-wide">
          <h2>
            <HardDrive size={20} />
            {t.data}
          </h2>
          <p>{t.backupHint}</p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() =>
                downloadBlob(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: 'application/json',
                  }),
                  `buildos-backup-${dateKey()}.json`,
                )
              }
            >
              <Download size={17} />
              {t.export}
            </button>
            <button className="button" onClick={() => input.current?.click()}>
              <Upload size={17} />
              {t.import}
            </button>
            <input
              hidden
              ref={input}
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
          </div>
          <div className="info-note">
            <ShieldCheck size={19} />
            {t.localHint}
          </div>
        </section>
      </div>
      <section className="panel settings-panel" style={{ marginTop: 22 }}>
        <h2>{t.exploreDemo}</h2>
        <p>{t.demoHint}</p>
        <button className="button" onClick={() => setDemo(!demo)}>
          {demo ? t.exitDemo : t.exploreDemo}
        </button>
      </section>
    </>
  );
}
