import React, { useEffect } from 'react';
import QuickAccess from '../components/QuickAccess';
import UnifiedFileBox from '../components/UnifiedFileBox';

const HomePage: React.FC = () => {
  useEffect(() => {
    document.title = 'ShareAnything';
  }, []);

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <UnifiedFileBox />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <QuickAccess />
      </div>
    </div>
  );
};

export default HomePage;
