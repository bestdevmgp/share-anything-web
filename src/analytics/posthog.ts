import type { PostHog } from 'posthog-js';

const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

type Props = Record<string, unknown>;

const QUEUE_LIMIT = 50;

let client: PostHog | null = null;
let booting = false;
const queue: { name: string; props?: Props }[] = [];

const isLocalhost = () =>
  typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

export const isAnalyticsEnabled = () => Boolean(KEY) && !isLocalhost();

const VISIT_TOTAL = 'sa_visits';
const VISIT_COUNTED = 'sa_visit_counted';

const nextVisitCount = () => {
  try {
    const total = Number(localStorage.getItem(VISIT_TOTAL)) || 0;
    if (sessionStorage.getItem(VISIT_COUNTED)) return total || 1;
    const next = total + 1;
    localStorage.setItem(VISIT_TOTAL, String(next));
    sessionStorage.setItem(VISIT_COUNTED, '1');
    return next;
  } catch {
    return null;
  }
};

type NetworkInformation = { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };

export const networkInfo = (): Props => {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return {};
  return {
    net_type: connection.effectiveType,
    net_downlink_mbps: connection.downlink,
    net_rtt_ms: connection.rtt,
    net_save_data: connection.saveData,
  };
};

export function track(name: string, props?: Props) {
  if (!isAnalyticsEnabled()) return;
  if (client) {
    client.capture(name, props);
    return;
  }
  if (queue.length < QUEUE_LIMIT) queue.push({ name, props });
}

export function setLocale(locale: string) {
  client?.register({ locale });
}

export async function bootPostHog() {
  if (!KEY || !isAnalyticsEnabled() || booting || client) return;
  booting = true;

  const { default: posthog } = await import('posthog-js');

  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: 'history_change',
    person_profiles: 'identified_only',
    disable_capture_url_hashes: true,
    persistence: 'localStorage+cookie',
  });

  const visits = nextVisitCount();
  posthog.register({
    locale: document.documentElement.lang || 'ko',
    ...networkInfo(),
    ...(visits === null ? {} : { visit_count: visits }),
  });

  client = posthog;
  for (const event of queue.splice(0)) posthog.capture(event.name, event.props);
}
