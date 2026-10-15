import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Globe2,
  Sun,
  Moon,
  LoaderCircle,
  LockKeyhole,
} from 'lucide-react';
import { useAuth } from './context';
import { useI18n, type Locale } from '../i18n/context';
import { ApiError } from '../data/api';
import { Architecture } from '../components/Architecture';
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { t, locale, setLocale, theme, toggleTheme } = useI18n();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const invite = new URLSearchParams(location.search).get('invite');
  const operation = invite ? 'accept' : auth.setupRequired ? 'setup' : 'login';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await auth.submit(operation, {
        ...values,
        ...(invite ? { token: invite } : {}),
      });
    } catch (error) {
      setError(error instanceof ApiError ? error.code : 'REQUEST_FAILED');
    } finally {
      setBusy(false);
    }
  }
  if (auth.session || auth.demoAccess) return children;
  const translatedError = (code: string) => {
    if (code === 'LOGIN_FAILED') return t.loginFailed;
    if (code === 'INVITE_EXPIRED') return t.inviteExpired;
    if (code === 'INVALID_INPUT') return t.authValidation;
    if (code === 'INVALID_SETUP_TOKEN') return t.setupTokenError;
    if (code === 'RATE_LIMITED') return t.tooManyAttempts;
    return t.serverUnavailable;
  };
  return (
    <div className="auth-screen">
      <aside className="auth-story">
        <div className="auth-brand">
          <span className="brand-mark" />
          <strong>
            Build<span>OS</span>
          </strong>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">{t.workspace}</span>
          <h1>{t.authHeadline}</h1>
          <p>{t.authDescription}</p>
          <div className="auth-art">
            <Architecture variant={99} />
          </div>
          <div className="auth-trust">
            <ShieldCheck size={18} />
            {t.authTrust}
          </div>
        </div>
        <span className="auth-copyright">
          BuildOS © {new Date().getFullYear()}
        </span>
      </aside>
      <div className="auth-main">
        <header className="auth-toolbar">
          <Globe2 size={16} />
          <select
            aria-label={t.language}
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="ru">RU</option>
            <option value="kk">KZ</option>
            <option value="en">EN</option>
          </select>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t.dark : t.light}
          >
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>
        </header>
        <div className="auth-form-wrap">
          <div className="auth-demo-entry">
            <button
              type="button"
              className={`button ${auth.demoOnly ? 'primary' : ''}`}
              onClick={auth.startDemo}
            >
              <ArrowRight size={17} />
              {t.demoSignIn}
            </button>
            <p>{t.publicDemoHint}</p>
          </div>
          {auth.demoOnly ? (
            <>
              <span className="eyebrow">BUILDOS / DEMO</span>
              <h2>{t.demoWelcome}</h2>
            </>
          ) : auth.loading ? (
            <div className="auth-loading" role="status">
              <LoaderCircle className="spin" size={28} />
              <p>{t.checkingSession}</p>
            </div>
          ) : auth.error ? (
            <div className="auth-error">
              <LockKeyhole size={32} />
              <h2>{t.serverUnavailable}</h2>
              <p>{t.serverUnavailableHint}</p>
              <button
                className="button primary"
                onClick={() => void auth.refresh()}
              >
                {t.retry}
              </button>
            </div>
          ) : (
            <>
              <span className="auth-icon">
                <LockKeyhole size={25} />
              </span>
              <div className="eyebrow">{t.privateWorkspace}</div>
              <h2>
                {operation === 'setup'
                  ? t.ownerSetup
                  : operation === 'accept'
                    ? t.joinTeam
                    : t.welcomeBack}
              </h2>
              <p>
                {operation === 'setup'
                  ? t.ownerSetupHint
                  : operation === 'accept'
                    ? t.joinTeamHint
                    : t.loginHint}
              </p>
              <form
                className="auth-form"
                onSubmit={(event) => void submit(event)}
              >
                {operation === 'setup' && (
                  <label>
                    {t.companyName}
                    <input
                      name="company"
                      required
                      minLength={2}
                      maxLength={160}
                      autoComplete="organization"
                    />
                  </label>
                )}
                {operation !== 'login' && (
                  <label>
                    {t.fullName}
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                    />
                  </label>
                )}
                {operation !== 'accept' && (
                  <label>
                    {t.email}
                    <input
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="username"
                    />
                  </label>
                )}
                <label>
                  {t.password}
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={operation === 'login' ? 1 : 12}
                    maxLength={128}
                    autoComplete={
                      operation === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                  />
                </label>
                {operation !== 'login' && (
                  <span className="form-hint">{t.passwordHint}</span>
                )}
                {operation === 'setup' && auth.requiresSetupToken && (
                  <label>
                    {t.setupToken}
                    <input
                      name="setupToken"
                      required
                      type="password"
                      autoComplete="off"
                    />
                  </label>
                )}
                {error && (
                  <div className="form-error" role="alert">
                    {translatedError(error)}
                  </div>
                )}
                <button className="button primary" disabled={busy}>
                  {busy ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <ArrowRight size={17} />
                  )}{' '}
                  {operation === 'setup'
                    ? t.createWorkspace
                    : operation === 'accept'
                      ? t.register
                      : t.signIn}
                </button>
              </form>
              <div className="auth-footnote">
                <ShieldCheck size={15} />
                {t.inviteOnly}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
