import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useTranslation } from '../i18n';
import animationData from '../assets/lottie-404.json';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-center px-4 pt-0 pb-[119px] md:pb-[169px]">
      <div className="text-center">
        <Lottie
          animationData={animationData}
          loop
          className="w-80 md:w-96 mx-auto dark:invert -mt-[3px] md:-mt-1"
        />
        <p className="text-gray-600 dark:text-[#888888] mb-8 mt-2">
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
