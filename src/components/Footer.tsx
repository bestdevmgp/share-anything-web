import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const Footer: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <footer className="bg-white dark:bg-[#010001] border-t border-gray-200 dark:border-white/10 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Links */}
        <div className="flex justify-center items-center gap-8 mb-6">
          <a
            href="/privacy-policy"
            className="text-gray-600 dark:text-[#888888] hover:text-gray-900 dark:hover:text-[#EDEDED] text-sm transition-colors"
          >
            개인정보처리방침
          </a>
          <a
            href="/terms-of-use"
            className="text-gray-600 dark:text-[#888888] hover:text-gray-900 dark:hover:text-[#EDEDED] text-sm transition-colors"
          >
            이용약관
          </a>
        </div>

        {/* GitHub Icons */}
        <div className="flex justify-center items-center gap-4 mb-6">
          {/* GitHub Icon */}
          <a
            href="https://github.com/bestdevmgp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-[#666666] hover:text-gray-700 dark:hover:text-[#EDEDED] transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>

          {/* Portfolio Icon */}
          <a
            href="https://mingyu.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-[#666666] hover:text-gray-700 dark:hover:text-[#EDEDED] transition-colors"
            aria-label="Portfolio"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>

          {/* Email Icon */}
          <a
            href="mailto:me@mingyu.dev"
            className="text-gray-500 dark:text-[#666666] hover:text-gray-700 dark:hover:text-[#EDEDED] transition-colors"
            aria-label="Email"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </a>
        </div>

        {/* Copyright */}
        <div className="text-center mb-5">
          <p className="text-sm text-gray-500 dark:text-[#666666]">
            © 2026 ShareAnything. All rights reserved.
          </p>
        </div>

        {/* Theme Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-white/10 p-0.5 bg-gray-100 dark:bg-white/5">
            <button
              onClick={() => setTheme('system')}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                theme === 'system'
                  ? 'bg-white dark:bg-[#222222] text-gray-900 dark:text-[#EDEDED] shadow-sm ring-1 ring-gray-300 dark:ring-white/20'
                  : 'text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888]'
              }`}
              title="시스템 설정"
            >
              <ComputerDesktopIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                theme === 'light'
                  ? 'bg-white dark:bg-[#222222] text-gray-900 dark:text-[#EDEDED] shadow-sm ring-1 ring-gray-300 dark:ring-white/20'
                  : 'text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888]'
              }`}
              title="라이트 모드"
            >
              <SunIcon className="w-[15px] h-[15px]" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                theme === 'dark'
                  ? 'bg-white dark:bg-[#222222] text-gray-900 dark:text-[#EDEDED] shadow-sm ring-1 ring-gray-300 dark:ring-white/20'
                  : 'text-gray-400 dark:text-[#666666] hover:text-gray-600 dark:hover:text-[#888888]'
              }`}
              title="다크 모드"
            >
              <MoonIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
