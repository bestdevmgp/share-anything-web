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
