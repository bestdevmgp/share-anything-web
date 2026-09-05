import { useEffect } from 'react';

import { bootPostHog } from './posthog';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const AnalyticsBoot = () => {
  useEffect(() => {
    const idleWindow = window as IdleWindow;
    let handle = 0;

    const schedule = () => {
      handle = idleWindow.requestIdleCallback
        ? idleWindow.requestIdleCallback(() => void bootPostHog(), { timeout: 2000 })
        : window.setTimeout(() => void bootPostHog(), 1);
    };

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      window.removeEventListener('load', schedule);
      if (handle && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
    };
  }, []);

  return null;
};

export default AnalyticsBoot;
