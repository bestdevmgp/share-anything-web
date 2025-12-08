import React, { useRef } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onError,
  onExpire
}) => {
  const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;
  const turnstileRef = useRef<TurnstileInstance>(null);

  if (!siteKey) {
    console.error('REACT_APP_TURNSTILE_SITE_KEY is not defined in environment variables');
    return null;
  }

  const handleExpire = () => {
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
    if (onExpire) {
      onExpire();
    }
  };

  return (
    <div className="flex justify-center">
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        onExpire={handleExpire}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
};

export default TurnstileWidget;
