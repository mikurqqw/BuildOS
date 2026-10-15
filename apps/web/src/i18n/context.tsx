import { createContext, useContext, useState, type ReactNode } from 'react';
import { formatKazakhDate } from '@buildos/shared';
import { ru, type Messages } from './ru';
import { en } from './en';
import { kk } from './kk';
export type Locale = 'ru' | 'kk' | 'en';
const dictionaries = { ru, kk, en };
const Context = createContext<{
  t: Messages;
  locale: Locale;
  setLocale: (value: Locale) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  money: (value: number) => string;
  date: (value: string) => string;
} | null>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLanguage] = useState<Locale>(() => {
    try {
      const value = localStorage.getItem('buildos-locale');
      return value === 'kk' || value === 'en' ? value : 'ru';
    } catch {
      return 'ru';
    }
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  function setLocale(value: Locale) {
    setLanguage(value);
    document.documentElement.lang = value;
    try {
      localStorage.setItem('buildos-locale', value);
    } catch {
      /* Preferences remain active for this session. */
    }
  }
  function toggleTheme() {
    const value = theme === 'light' ? 'dark' : 'light';
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem('buildos-theme', value);
    } catch {
      /* Preferences remain active for this session. */
    }
  }
  const intlLocale =
    locale === 'kk' ? 'kk-KZ' : locale === 'ru' ? 'ru-KZ' : 'en-GB';
  return (
    <Context.Provider
      value={{
        t: dictionaries[locale],
        locale,
        setLocale,
        theme,
        toggleTheme,
        money: (value) =>
          new Intl.NumberFormat(locale === 'kk' ? 'ru-KZ' : intlLocale, {
            style: 'currency',
            currency: 'KZT',
            maximumFractionDigits: 0,
          }).format(value),
        date: (value) =>
          locale === 'kk'
            ? formatKazakhDate(value)
            : new Intl.DateTimeFormat(intlLocale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Qyzylorda',
              }).format(new Date(value)),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error('I18n provider missing');
  return context;
}
