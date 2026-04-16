import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    toast.success(t('header.logoutSuccess'));
    navigate('/');
  };

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'var(--share-bubble-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px"
                 fill="currentColor" className="flex-shrink-0 text-primary">
                <path
                    d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
            </svg>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Geist', sans-serif" }}>ShareAnything</h1>
          </Link>

          <div className="flex items-center space-x-2">
            <Link
              to="/cli"
              className="hidden sm:inline-flex items-center gap-1 pl-3 pr-2 py-1.5 text-xs font-medium text-muted-foreground can-hover:hover:text-foreground active:text-foreground border border-border can-hover:hover:border-foreground/20 active:border-foreground/20 rounded-md transition-colors"
            >
              Try CLI
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="group flex items-center space-x-2 active:bg-accent can-hover:hover:bg-accent rounded-lg px-3 py-2 transition-colors focus:outline-none data-[state=open]:bg-accent">
                  {user.profile_image && (
                    <img
                      src={user.profile_image}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-foreground/80">{user.name}</span>
                  <ChevronDownIcon className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => navigate('/history')}
                    className="cursor-pointer px-4 py-2 text-sm"
                  >
                    {t('header.uploadHistory')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="cursor-pointer px-4 py-2 text-sm"
                  >
                    {t('header.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer px-4 py-2 text-sm text-red-600 dark:text-red-400 font-medium can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 focus:bg-red-100/50 dark:focus:bg-red-500/15 focus:text-red-600 dark:focus:text-red-400 active:bg-red-100/50 dark:active:bg-red-500/15 active:text-red-600 dark:active:text-red-400"
                  >
                    {t('header.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/signin"
                className="px-4 py-2 text-sm text-primary can-hover:hover:bg-primary/10 active:bg-primary/10 rounded-lg font-medium"
              >
                {t('header.login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
