import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: Language[] = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'];

const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang === 'zh-TW' || browserLang === 'zh-Hant') return 'zh-TW';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
    return getBrowserLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

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
