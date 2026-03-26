import React, { useEffect, useLayoutEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useTheme } from '../context/ThemeContext';

// Inline logo as data URL to eliminate network request and async image loading delay
const qrLogoDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iOTYwIiB2aWV3Qm94PSIwIC05NjAgOTYwIDk2MCIgd2lkdGg9Ijk2MCIgZmlsbD0iIzAwNjhmZSI+CiAgPHBhdGggZD0iTTEyMC0xNjB2LTY0MGw3NjAgMzIwLTc2MCAzMjBabTgwLTEyMCA0NzQtMjAwLTQ3NC0yMDB2MTQwbDI0MCA2MC0yNDAgNjB2MTQwWm0wIDB2LTQwMCA0MDBaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0LDApIi8+Cjwvc3ZnPgo=';

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
        image: qrLogoDataUrl,
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
