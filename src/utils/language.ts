// Single source of truth for "which language is the user actually seeing".
// Both LanguageContext (the UI) and api.ts (the uploaded `locale` for OG previews)
// resolve the language through here so the two can never drift apart — the bug where
// a Korean-browser user saw Korean UI but the OG preview fell back to English came
// from api.ts reading only localStorage, which is empty until the user *manually*
// switches language.

export type Language = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW';

export const SUPPORTED_LANGUAGES: Language[] = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'];

export const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang === 'zh-TW' || browserLang === 'zh-Hant') return 'zh-TW';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  return 'en';
};

/**
 * The language the user is actually seeing: their saved choice if they picked one,
 * otherwise the browser default. Mirrors LanguageContext's initial-state logic, so a
 * user who never manually switched language still resolves to their real language.
 */
export const resolveLanguage = (): Language => {
  try {
    const stored = localStorage.getItem('language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // localStorage unavailable (private mode / blocked) — fall through to the browser default.
  }
  return getBrowserLanguage();
};
