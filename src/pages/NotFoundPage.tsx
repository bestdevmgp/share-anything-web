import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useTranslation } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import animationData from '../assets/lottie-404.json';

function replaceFillColors(items: any[]) {
  for (const item of items) {
    if (item.it) replaceFillColors(item.it);
    if (item.ty === 'fl' && item.c?.a === 0) {
      const [r, g, b] = item.c.k;
      if (r > 0.9 && g > 0.9 && b > 0.9) {
        // 큰 회전 원: 거의 흰색 → 검정 + 파란 톤
        item.c.k = [0.04, 0.05, 0.14, 1.0];
      } else if (r > 0.7 && r < 0.8 && b > 0.99) {
        // 움직이는 구름: 연한 파란 → 어두운 파란
        item.c.k = [0.07, 0.09, 0.22, 1.0];
      }
    }
  }
}

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  const animData = useMemo(() => {
    if (resolvedTheme !== 'dark') return animationData;
    const data = JSON.parse(JSON.stringify(animationData));
    for (const layer of data.layers) {
      if (layer.shapes) {
        for (const shape of layer.shapes) {
          if (shape.it) replaceFillColors(shape.it);
        }
      }
    }
    return data;
  }, [resolvedTheme]);

  return (
    <div className="flex items-start justify-center px-4 pt-16 md:pt-20 pb-[119px] md:pb-[169px]">
      <div className="text-center">
        <Lottie
          key={resolvedTheme}
          animationData={animData}
          loop
          className="w-80 md:w-96 mx-auto"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-3">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8">
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
