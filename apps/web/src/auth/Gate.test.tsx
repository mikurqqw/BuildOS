import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGate } from './Gate';
import { ru } from '../i18n/ru';
const auth = vi.hoisted(() => ({
  session: null,
  demoAccess: false,
  demoOnly: false,
  loading: false,
  error: '',
  setupRequired: false,
  startDemo: vi.fn(),
}));
vi.mock('./context', () => ({ useAuth: () => auth }));
vi.mock('../i18n/context', () => ({
  useI18n: () => ({
    t: ru,
    locale: 'ru',
    theme: 'light',
    setLocale: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));
afterEach(() => {
  auth.demoAccess = false;
  auth.demoOnly = false;
  auth.loading = false;
  auth.error = '';
  vi.unstubAllGlobals();
});
describe('public demo entry', () => {
  it('shows only a new password field for a recovery link', () => {
    vi.stubGlobal('location', { search: '?reset=' + 'a'.repeat(64) });
    const html = renderToStaticMarkup(
      <AuthGate>
        <span>Private content</span>
      </AuthGate>,
    );
    expect(html).toContain('name="password"');
    expect(html).not.toContain('name="email"');
    expect(html).not.toContain('name="name"');
    expect(html).not.toContain('Private content');
  });
  it('does not offer unavailable employee login in a standalone demo build', () => {
    vi.stubGlobal('location', { search: '' });
    auth.demoOnly = true;
    const html = renderToStaticMarkup(
      <AuthGate>
        <span>Private content</span>
      </AuthGate>,
    );
    expect(html).toContain('Демо 1 — пустое');
    expect(html).toContain('Демо 2 — с примерами');
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain('Private content');
  });
  it('offers a demo without registration even when the API is unavailable', () => {
    vi.stubGlobal('location', { search: '' });
    auth.error = 'SERVER_UNAVAILABLE';
    expect(
      renderToStaticMarkup(
        <AuthGate>
          <span>Private content</span>
        </AuthGate>,
      ),
    ).toContain('Демо 1 — пустое');
  });
  it('opens the illustrative workspace without inventing an employee session', () => {
    vi.stubGlobal('location', { search: '' });
    auth.demoAccess = true;
    expect(
      renderToStaticMarkup(
        <AuthGate>
          <span>Illustrative workspace</span>
        </AuthGate>,
      ),
    ).toContain('Illustrative workspace');
    expect(auth.session).toBeNull();
  });
});
