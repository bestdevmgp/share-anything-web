import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useTranslation } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import animationData from '../assets/lottie-404.json';

const ORIG_MAIN   = [0.149, 0.361, 1.000];
const ORIG_SHADOW = [0.123, 0.256, 0.703];
const ORIG_MEDIUM = [0.451, 0.589, 0.999];
const ORIG_GRAY   = [0.416, 0.475, 0.659];
const ORIG_CLOUD  = [0.749, 0.808, 1.000];
const ORIG_WHITE  = [0.947, 0.959, 0.999];

function colorClose(c: number[], t: number[], tol = 0.03): boolean {
  return Math.abs(c[0] - t[0]) < tol && Math.abs(c[1] - t[1]) < tol && Math.abs(c[2] - t[2]) < tol;
}

function replaceColors(items: any[], isDark: boolean) {
  for (const item of items) {
    if (item.it) replaceColors(item.it, isDark);
    if (item.ty === 'fl' && item.c?.a === 0) {
      const c = item.c.k;
      if (colorClose(c, ORIG_MAIN)) {
        item.c.k = isDark ? [0.227, 0.341, 0.969, 1] : [0.227, 0.337, 0.969, 1];
      } else if (colorClose(c, ORIG_SHADOW)) {
        item.c.k = isDark ? [0.165, 0.255, 0.800, 1] : [0.141, 0.224, 0.690, 1];
      } else if (colorClose(c, ORIG_MEDIUM)) {
        item.c.k = isDark ? [0.380, 0.455, 0.910, 1] : [0.471, 0.545, 0.957, 1];
      } else if (colorClose(c, ORIG_GRAY)) {
        item.c.k = isDark ? [0.310, 0.355, 0.585, 1] : [0.420, 0.463, 0.655, 1];
      } else if (colorClose(c, ORIG_CLOUD)) {
        item.c.k = isDark ? [0.059, 0.086, 0.239, 1] : [0.745, 0.784, 0.976, 1];
      } else if (colorClose(c, ORIG_WHITE)) {
        item.c.k = isDark ? [0.039, 0.051, 0.118, 1] : [0.929, 0.937, 0.988, 1];
      }
    }
  }
}

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  const animData = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    const data = JSON.parse(JSON.stringify(animationData));
    for (const layer of data.layers) {
      if (layer.shapes) {
        for (const shape of layer.shapes) {
          if (shape.it) replaceColors(shape.it, isDark);
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
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-8 mb-3">
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
