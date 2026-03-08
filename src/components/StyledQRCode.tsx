import React, { useEffect, useLayoutEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useTheme } from '../context/ThemeContext';

// Preload QR logo so it's cached when QRCodeStyling requests it
const qrLogoUrl = `${process.env.PUBLIC_URL}/logo-qr.svg`;
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = qrLogoUrl;
  document.head.appendChild(link);
}

interface StyledQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const StyledQRCode: React.FC<StyledQRCodeProps> = ({ value, size = 200, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const fgColor = isDark ? '#ffffff' : '#000000';
  const bgColor = isDark ? '#0a0a0a' : '#ffffff';

  useLayoutEffect(() => {
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: value,
        margin: 0,
        image: qrLogoUrl,
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
          hideBackgroundDots: true,
          margin: 5,
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
