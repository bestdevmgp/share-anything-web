import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useTranslation } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/ui/button';
import animationData from '../assets/lottie-404.json';

// 원본 애니메이션 색상 (normalized RGB)
const ORIG_MAIN   = [0.149, 0.361, 1.000]; // #265CFF - "4" 숫자, 지구본
const ORIG_SHADOW = [0.123, 0.256, 0.703]; // #1F41B3 - 지구본 그림자
const ORIG_MEDIUM = [0.451, 0.589, 0.999]; // #7396FF - 지구본 표면 곡선
const ORIG_GRAY   = [0.416, 0.475, 0.659]; // #6A79A8 - 격자선, Wi-Fi 아이콘
const ORIG_CLOUD  = [0.749, 0.808, 1.000]; // #BFCEFF - 떠다니는 구름
const ORIG_WHITE  = [0.947, 0.959, 0.999]; // #F1F5FF - 배경 회전 원

function colorClose(c: number[], t: number[], tol = 0.03): boolean {
  return Math.abs(c[0] - t[0]) < tol && Math.abs(c[1] - t[1]) < tol && Math.abs(c[2] - t[2]) < tol;
}

function replaceColors(items: any[], isDark: boolean) {
  for (const item of items) {
    if (item.it) replaceColors(item.it, isDark);
    if (item.ty === 'fl' && item.c?.a === 0) {
      const c = item.c.k;
      if (colorClose(c, ORIG_MAIN)) {
        // 메인 블루 → 브랜드 컬러
        item.c.k = isDark ? [0.227, 0.341, 0.969, 1] : [0.227, 0.337, 0.969, 1];
      } else if (colorClose(c, ORIG_SHADOW)) {
        // 지구본 그림자 → 브랜드 어두운 변형
        item.c.k = isDark ? [0.165, 0.255, 0.800, 1] : [0.141, 0.224, 0.690, 1];
      } else if (colorClose(c, ORIG_MEDIUM)) {
        // 표면 곡선 → 브랜드 밝은 변형
        item.c.k = isDark ? [0.380, 0.455, 0.910, 1] : [0.471, 0.545, 0.957, 1];
      } else if (colorClose(c, ORIG_GRAY)) {
        // 격자선 → 브랜드 톤 그레이
        item.c.k = isDark ? [0.310, 0.355, 0.585, 1] : [0.420, 0.463, 0.655, 1];
      } else if (colorClose(c, ORIG_CLOUD)) {
        // 구름 → 라이트: 브랜드 연한 틴트 / 다크: 어두운 브랜드 톤
        item.c.k = isDark ? [0.059, 0.086, 0.239, 1] : [0.745, 0.784, 0.976, 1];
      } else if (colorClose(c, ORIG_WHITE)) {
        // 배경 원 → 라이트: 거의 흰 브랜드 / 다크: 거의 검정 브랜드
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
