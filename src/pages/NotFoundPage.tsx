import React from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
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
        <p className="text-muted-foreground mb-8 mt-2">
          {t('notFound.description')}
        </p>
        <Button
          onClick={() => navigate('/')}
        >
          {t('notFound.goHome')}
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;
