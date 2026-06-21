import React, { useEffect } from 'react';
import QuickAccess from '../components/QuickAccess';
import UnifiedFileBox from '../components/UnifiedFileBox';
import DailyUploadQuotaWidget from '../components/DailyUploadQuotaWidget';

const HomePage: React.FC = () => {
  useEffect(() => {
    document.title = 'ShareAnything';
  }, []);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <UnifiedFileBox />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        <QuickAccess />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <DailyUploadQuotaWidget />
      </div>
    </div>
  );
};

export default HomePage;
