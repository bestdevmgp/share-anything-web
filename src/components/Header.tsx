import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';


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
    <header className="bg-white dark:bg-[#010001]/80 dark:backdrop-blur-xl shadow-sm dark:shadow-none dark:border-b dark:border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px"
                 fill="#0065F4" className="flex-shrink-0">
                <path
                    d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">ShareAnything</h1>
          </Link>

          <div className="flex items-center space-x-2">
            {isAuthenticated && user ? (
              <Menu as="div" className="relative">
                {({ open }) => (
                  <>
                    <Menu.Button className={`flex items-center space-x-2 active:bg-gray-50 dark:active:bg-white/10 sm:hover:bg-gray-50 dark:sm:hover:bg-white/10 rounded-lg px-3 py-2 transition-colors focus:outline-none ${open ? 'bg-gray-50 dark:bg-white/10' : ''}`}>
                      {user.profile_image && (
                        <img
                          src={user.profile_image}
                          alt={user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="text-sm text-gray-700 dark:text-[#EDEDED]">{user.name}</span>
                      <ChevronDownIcon className={`w-4 h-4 text-gray-500 dark:text-[#888888] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </Menu.Button>
                    <Transition
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 -translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 -translate-y-1"
                    >
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1A] rounded-lg shadow-lg border border-gray-200 dark:border-white/10 py-1 focus:outline-none z-50">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => navigate('/history')}
                        className={`${
                          active ? 'bg-gray-100 dark:bg-white/10' : ''
                        } w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-[#EDEDED]`}
                      >
                        {t('header.uploadHistory')}
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-red-50 dark:bg-red-500/10' : ''
                        } w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 font-medium`}
                      >
                        {t('header.logout')}
                      </button>
                    )}
                  </Menu.Item>
                    </Menu.Items>
                    </Transition>
                  </>
                )}
              </Menu>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm text-primary-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg font-medium"
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
