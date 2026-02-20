import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useTheme } from '../context/ThemeContext';

interface StyledQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const RENDER_SIZE = 1000;

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
        width: RENDER_SIZE,
        height: RENDER_SIZE,
        type: 'svg',
        data: value,
        margin: 0,
        image: `${process.env.PUBLIC_URL}/logo-qr.svg`,
        dotsOptions: {
          type: 'dots',
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
          imageSize: 0.45,
        },
        qrOptions: {
          errorCorrectionLevel: 'H',
        },
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        qrCodeRef.current.append(containerRef.current);
        const svg = containerRef.current.querySelector('svg');
        if (svg) {
          svg.setAttribute('viewBox', `0 0 ${RENDER_SIZE} ${RENDER_SIZE}`);
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.style.width = '100%';
          svg.style.height = '100%';
          svg.style.display = 'block';
        }
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
      qrCodeRef.current.update({
        dotsOptions: { type: 'dots', color: fgColor },
        cornersSquareOptions: { type: 'extra-rounded', color: fgColor },
        cornersDotOptions: { type: 'dot', color: fgColor },
        backgroundOptions: { color: bgColor },
      });
    }
  }, [fgColor, bgColor]);

  return <div ref={containerRef} className={className} style={{ width: size, height: size }} />;
};

export default StyledQRCode;
