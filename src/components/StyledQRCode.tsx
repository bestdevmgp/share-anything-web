import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useTheme } from '../context/ThemeContext';

interface StyledQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const BRAND_COLOR = '#0065f4';

const createLogoDataUrl = (bgColor: string): string => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    `<circle cx="50" cy="50" r="50" fill="${bgColor}"/>`,
    '<svg x="18" y="23" width="65" height="55" viewBox="120 -800 760 640">',
    `<path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" transform="translate(12,0)" fill="${BRAND_COLOR}"/>`,
    '</svg>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const StyledQRCode: React.FC<StyledQRCodeProps> = ({ value, size = 200, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const fgColor = isDark ? '#ffffff' : '#000000';
  const bgColor = isDark ? '#0a0a0a' : '#ffffff';

  useEffect(() => {
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: value,
        margin: 0,
        image: createLogoDataUrl(bgColor),
        dotsOptions: {
          type: 'dots',
          roundSize: false,
          color: fgColor,
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: fgColor,
        },
        cornersDotOptions: {
          type: 'dot',
          color: fgColor,
        },
        backgroundOptions: {
          color: bgColor,
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          hideBackgroundDots: false,
          margin: 0,
          imageSize: 0.32,
        },
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        qrCodeRef.current.append(containerRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (qrCodeRef.current) {
      qrCodeRef.current.update({ data: value });
    }
  }, [value]);

  useEffect(() => {
    if (qrCodeRef.current) {
      qrCodeRef.current.update({ width: size, height: size });
    }
  }, [size]);

  useEffect(() => {
    if (qrCodeRef.current) {
      qrCodeRef.current.update({
        image: createLogoDataUrl(bgColor),
        dotsOptions: { type: 'dots', roundSize: false, color: fgColor },
        cornersSquareOptions: { type: 'extra-rounded', color: fgColor },
        cornersDotOptions: { type: 'dot', color: fgColor },
        backgroundOptions: { color: bgColor },
      });
    }
  }, [fgColor, bgColor]);

  return <div ref={containerRef} className={className} />;
};

export default StyledQRCode;
