import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon, ChevronUpIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../i18n';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const langOptions = [
  { key: 'ko' as const, label: '한국어' },
  { key: 'en' as const, label: 'English' },
  { key: 'ja' as const, label: '日本語' },
  { key: 'zh-CN' as const, label: '简体中文' },
  { key: 'zh-TW' as const, label: '繁體中文' },
];

const themeIcons: Record<string, React.ReactNode> = {
  system: <ComputerDesktopIcon className="w-4 h-4" />,
  light: <SunIcon className="w-[18px] h-[18px]" />,
  dark: <MoonIcon className="w-4 h-4" />,
};

const Footer: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { t } = useTranslation();

  const themeOptions = [
    { key: 'system' as const, label: t('footer.themeSystem') },
    { key: 'light' as const, label: t('footer.themeLight') },
    { key: 'dark' as const, label: t('footer.themeDark') },
  ];

  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const currentLang = langOptions.find((o) => o.key === lang)!;

  return (
    <footer className="bg-card dark:bg-background border-t border-border/80 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center items-center gap-8 mb-6">
          <a
            href="/privacy-policy"
            className="text-muted-foreground can-hover:hover:text-foreground active:text-foreground text-sm transition-colors"
          >
            {t('footer.privacyPolicy')}
          </a>
          <a
            href="/terms-of-use"
            className="text-muted-foreground can-hover:hover:text-foreground active:text-foreground text-sm transition-colors"
          >
            {t('footer.termsOfUse')}
          </a>
          <a
            href="/cli"
            className="text-muted-foreground can-hover:hover:text-foreground active:text-foreground text-sm transition-colors"
          >
            CLI
          </a>
        </div>

        <div className="flex justify-center items-center gap-4 mb-6">
          <a
            href="https://github.com/bestdevmgp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 can-hover:hover:text-foreground active:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>

          <a
            href="https://mingyu.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 can-hover:hover:text-foreground active:text-foreground transition-colors"
            aria-label="Portfolio"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>

          <a
            href="mailto:me@mingyu.dev"
            className="text-muted-foreground/70 can-hover:hover:text-foreground active:text-foreground transition-colors"
            aria-label="Email"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </a>
        </div>

        <div className="flex justify-center items-end gap-[12px]">
          {/* Language Dropdown */}
          <Popover open={langOpen} onOpenChange={setLangOpen}>
            <PopoverTrigger asChild>
              <button
                className="group flex items-center justify-between w-40 h-10 px-2.5 border border-border bg-card  text-muted-foreground can-hover:hover:bg-accent active:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="w-4 h-4" />
                  <span>{currentLang.label}</span>
                </div>
                <ChevronUpIcon className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-40 p-0 rounded-none border border-border bg-card ">
              <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">{t('footer.language')}</div>
              {langOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => { setLang(option.key); setLangOpen(false); }}
                  className={`w-full flex items-center gap-3 px-2.5 h-10 text-sm transition-colors ${
                    lang === option.key
                      ? 'text-foreground'
                      : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                  }`}
                >
                  <CheckIcon className={`w-3.5 h-3.5 flex-shrink-0 ${lang === option.key ? 'opacity-100' : 'opacity-0'}`} />
                  <span>{option.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Theme Dropdown */}
          <Popover open={themeOpen} onOpenChange={setThemeOpen}>
            <PopoverTrigger asChild>
              <button
                className="group flex items-center justify-between w-16 h-10 px-2.5 border border-border bg-card  text-muted-foreground can-hover:hover:bg-accent active:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors text-sm"
              >
                {themeIcons[theme]}
                <ChevronUpIcon className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-28 p-0 rounded-none border border-border bg-card ">
              <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">{t('footer.theme')}</div>
              {themeOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => { setTheme(option.key); setThemeOpen(false); }}
                  className={`w-full flex items-center gap-3 px-2.5 h-10 text-sm transition-colors ${
                    theme === option.key
                      ? 'text-foreground'
                      : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                  }`}
                >
                  <CheckIcon className={`w-3.5 h-3.5 flex-shrink-0 ${theme === option.key ? 'opacity-100' : 'opacity-0'}`} />
                  <span>{option.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
