import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface StyledQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const StyledQRCode: React.FC<StyledQRCodeProps> = ({ value, size = 200, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: value,
        image: `${process.env.PUBLIC_URL}/logo-qr.svg`,
        dotsOptions: {
          type: 'dots',
          color: '#000000',
        },
        cornersSquareOptions: {
          type: 'extra-rounded',
          color: '#000000',
        },
        cornersDotOptions: {
          type: 'dot',
          color: '#000000',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4,
          imageSize: 0.4,
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
  }, [size, value]);

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

  return <div ref={containerRef} className={className} />;
};

export default StyledQRCode;
