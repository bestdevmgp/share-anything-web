import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { type Language, resolveLanguage } from '../utils/language';
import { setLocale } from '../analytics/posthog';

export type { Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => resolveLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  useEffect(() => {
    const htmlLang = language === 'zh-CN' ? 'zh-Hans' : language === 'zh-TW' ? 'zh-Hant' : language;
    document.documentElement.lang = htmlLang;

    const fontMap: Record<Language, string> = {
      ko: "Pretendard, 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      en: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      ja: "'Noto Sans JP', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      'zh-CN': "'Noto Sans SC', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      'zh-TW': "'Noto Sans TC', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
    };
    document.body.style.fontFamily = fontMap[language];
    setLocale(language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
