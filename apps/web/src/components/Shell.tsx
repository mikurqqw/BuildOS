import { dateKey } from '@buildos/shared';
import { NavLink, Link, useLocation } from 'react-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  TriangleAlert,
  Files,
  ChartNoAxesCombined,
  Wallet,
  Package,
  Users,
  Settings,
  Search,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { useI18n, type Locale } from '../i18n/context';
import { useWorkspace } from '../data/workspace';
import { Modal } from './ui';
import type { Messages } from '../i18n/ru';
import { useAuth } from '../auth/context';
const navigation = [
  {
    label: 'workspace',
    items: [
      { key: 'overview', path: '/', icon: LayoutDashboard },
      { key: 'projects', path: '/projects', icon: Building2 },
    ],
  },
  {
    label: 'construction',
    items: [
      { key: 'tasks', path: '/tasks', icon: CheckSquare },
      { key: 'issues', path: '/issues', icon: TriangleAlert },
      { key: 'documents', path: '/documents', icon: Files },
      { key: 'schedule', path: '/schedule', icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'management',
    items: [
      { key: 'budget', path: '/budget', icon: Wallet },
      { key: 'procurement', path: '/procurement', icon: Package },
      { key: 'team', path: '/team', icon: Users },
    ],
  },
] as const;
export function Shell({
  children,
  search,
  setSearch,
  onCreate,
}: {
  children: ReactNode;
  search: string;
  setSearch: (value: string) => void;
  onCreate: () => void;
}) {
  const { t, locale, setLocale, theme, toggleTheme } = useI18n();
  const { data, demo, setDemo, storageBlocked } = useWorkspace();
  const { session, logout } = useAuth();
  const initials =
    session?.user.name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('') || 'B';
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);
  const [mobile, setMobile] = useState(false);
  const [dialog, setDialog] = useState<
    'search' | 'notifications' | 'help' | null
  >(null);
  const [globalSearch, setGlobalSearch] = useState('');
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setDialog('search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const page =
    navigation
      .flatMap(
        (group) => [...group.items] as { key: keyof Messages; path: string }[],
      )
      .find((item) =>
        item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path),
      )?.key ?? 'settings';
  const overdue = data.tasks.filter(
    (task) =>
      task.due < dateKey() && !['DONE', 'CANCELLED'].includes(task.status),
  );
  const searchItems = [
    ...data.projects.map((item) => ({
      id: item.id,
      title: item.name,
      path: `/projects/${item.id}`,
      type: t.project,
    })),
    ...data.tasks.map((item) => ({
      id: item.id,
      title: item.title,
      path: '/tasks',
      type: t.tasks,
    })),
    ...data.issues.map((item) => ({
      id: item.id,
      title: item.title,
      path: '/issues',
      type: t.issues,
    })),
    ...data.documents.map((item) => ({
      id: item.id,
      title: item.name,
      path: '/documents',
      type: t.documents,
    })),
  ]
    .filter((item) =>
      item.title.toLocaleLowerCase().includes(globalSearch.toLocaleLowerCase()),
    )
    .slice(0, 20);
  const sidebar = (
    <>
      <Link to="/" className="brand" onClick={() => setMobile(false)}>
        <span className="brand-mark" />
        <strong>
          Build<span>OS</span>
        </strong>
        <span className="brand-tag">WORKSPACE</span>
      </Link>
      <Link
        to="/settings"
        className="company-switch"
        onClick={() => setMobile(false)}
      >
        <span className="company-avatar">B</span>
        <span>
          <strong>{session?.user.company || t.company}</strong>
          <small>{t.companySub}</small>
        </span>
        <ChevronDown size={15} />
      </Link>
      <nav aria-label={t.workspace}>
        {navigation.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-label">{t[group.label]}</span>
            {group.items.map((item) => (
              <NavLink
                end={item.path === '/'}
                to={item.path}
                key={item.key}
                onClick={() => {
                  setMobile(false);
                  setSearch('');
                }}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={19} />
                <span>{t[item.key]}</span>
                {item.key === 'tasks' &&
                  data.tasks.filter(
                    (task) => !['DONE', 'CANCELLED'].includes(task.status),
                  ).length > 0 && (
                    <span className="nav-counter">
                      {
                        data.tasks.filter(
                          (task) =>
                            !['DONE', 'CANCELLED'].includes(task.status),
                        ).length
                      }
                    </span>
                  )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="local-note">
          <ShieldCheck size={19} />
          <div>
            <strong>{t.local}</strong>
            <span>
              {demo
                ? 'DEMO'
                : storageBlocked
                  ? '!'
                  : t.accessActive.toLocaleUpperCase()}
            </span>
          </div>
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => setMobile(false)}
        >
          <Settings size={19} />
          {t.settings}
        </NavLink>
        <button
          className="nav-item"
          onClick={() => {
            setDialog('help');
            setMobile(false);
          }}
        >
          <HelpCircle size={19} />
          {t.help}
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="profile">
        <span className="user-avatar">{initials}</span>
        <div>
          <strong>{session?.user.name || t.demoGuest}</strong>
          <small>
            {demo
              ? 'DEMO'
              : session?.user.role === 'OWNER'
                ? t.ownerRole
                : t.employeeRole}
          </small>
        </div>
        <button
          className="icon-button"
          aria-label={t.signOut}
          onClick={() => {
            void logout().catch(() => window.alert(t.serverUnavailable));
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </>
  );
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">
        {t.overview}
      </a>
      <aside className="sidebar">{sidebar}</aside>
      <div className="app-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label={t.workspace}
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            {t.workspace.toLowerCase()}
            <span>/</span>
            <strong>{t[page as keyof Messages]}</strong>
          </div>
          <button
            className="icon-button compact-search"
            aria-label={t.search}
            onClick={() => setDialog('search')}
          >
            <Search size={19} />
          </button>
          <label className="header-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => {
                if (location.pathname === '/') setDialog('search');
              }}
              placeholder={t.search}
              aria-label={t.search}
            />
            <button aria-label={t.search} onClick={() => setDialog('search')}>
              <kbd>Ctrl K</kbd>
            </button>
          </label>
          <div className="topbar-actions">
            <select
              className="language-select"
              value={locale}
              aria-label={t.language}
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
            <button
              className="icon-button notification-button"
              aria-label={t.notifications}
              onClick={() => setDialog('notifications')}
            >
              <Bell size={19} />
              {overdue.length > 0 && <span />}
            </button>
            <div className="topbar-divider" />
            <button
              className="user-avatar"
              onClick={() => setDialog('help')}
              aria-label={t.help}
            >
              B
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <strong>{t.demo}</strong>
            <span>{t.demoHint}</span>
            <button onClick={() => setDemo(false)}>{t.exitDemo} →</button>
          </div>
        )}
        {storageBlocked && (
          <div className="storage-banner" role="alert">
            {t.storageError}
          </div>
        )}
        <main id="main" className="main-content">
          {children}
        </main>
        <nav className="mobile-tabs" aria-label={t.workspace}>
          <NavLink to="/" end>
            <LayoutDashboard size={20} />
            {t.overview}
          </NavLink>
          <NavLink to="/projects">
            <Building2 size={20} />
            {t.projects}
          </NavLink>
          <button onClick={onCreate} aria-label={t.newProject}>
            <Plus size={24} />
          </button>
          <NavLink to="/tasks">
            <CheckSquare size={20} />
            {t.tasks}
          </NavLink>
          <button onClick={() => setMobile(true)}>
            <Menu size={20} />
            {t.workspace.toLowerCase()}
          </button>
        </nav>
      </div>
      <Modal open={mobile} onClose={() => setMobile(false)} title="BuildOS">
        <div className="mobile-navigation">{sidebar}</div>
      </Modal>
      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={
          dialog === 'search'
            ? t.search
            : dialog === 'notifications'
              ? t.notifications
              : t.help
        }
      >
        {dialog === 'search' ? (
          <div className="search-dialog">
            <input
              autoFocus
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder={t.search}
            />
            <div className="search-results">
              {searchItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.path}
                  onClick={() => {
                    setSearch(item.type === t.project ? '' : item.title);
                    setDialog(null);
                  }}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.type}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {!searchItems.length && <p>{t.noResults}</p>}
            </div>
          </div>
        ) : dialog === 'notifications' ? (
          <div className="search-results">
            {overdue.length ? (
              overdue.map((task) => (
                <Link key={task.id} to="/tasks" onClick={() => setDialog(null)}>
                  <strong>{task.title}</strong>
                  <span className="danger-text">{t.overdue}</span>
                </Link>
              ))
            ) : (
              <p>{t.noNotifications}</p>
            )}
          </div>
        ) : (
          <div className="help-content">
            <p>{t.helpText}</p>
            <div className="info-note">{t.localHint}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
