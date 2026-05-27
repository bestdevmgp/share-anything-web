import { useLanguage, Language } from '../context/LanguageContext';
import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';
import zhCN from './zh-CN.json';
import zhTW from './zh-TW.json';

const translations: Record<Language, Record<string, Record<string, string>>> = { ko, en, ja, 'zh-CN': zhCN, 'zh-TW': zhTW };

export function translate(language: Language, key: string, params?: Record<string, string | number>): string {
  const [scope, ...rest] = key.split('.');
  const subKey = rest.join('.');

  let value = translations[language]?.[scope]?.[subKey]
    ?? translations['ko']?.[scope]?.[subKey]
    ?? key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }

  return value;
}

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(language, key, params);
  };

  return { t, language };
}

export function translateApiError(
  err: unknown,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!err || typeof err !== 'object') return t('common.unknownError');
  const e = err as { error?: unknown; message?: unknown };

  let code: string | undefined;
  let message: string | undefined;

  if (typeof e.error === 'string') {
    code = e.error;
    if (typeof e.message === 'string') message = e.message;
  } else if (e.error && typeof e.error === 'object') {
    const nested = e.error as { code?: unknown; message?: unknown };
    if (typeof nested.code === 'string') code = nested.code;
    if (typeof nested.message === 'string') message = nested.message;
  } else if (typeof e.message === 'string') {
    message = e.message;
  }

  if (code) {
    const key = `apiError.byCode.${code}`;
    const byCode = t(key);
    if (byCode && byCode !== key) return byCode;
  }
  return message || t('common.unknownError');
}
