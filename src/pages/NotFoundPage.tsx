import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-gray-300 dark:text-white/15 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED] mb-2">Not Found</h2>
        <p className="text-gray-600 dark:text-[#888888] mb-8">
          {t('notFound.description')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('notFound.goHome')}
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
