import { useLanguage, Language } from '../context/LanguageContext';
import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';
import zhCN from './zh-CN.json';
import zhTW from './zh-TW.json';

const translations: Record<Language, Record<string, Record<string, string>>> = { ko, en, ja, 'zh-CN': zhCN, 'zh-TW': zhTW };

export function translate(language: Language, key: string, params?: Record<string, string | number>): string {
  const [scope, ...rest] = key.split('.');
  const subKey = rest.join('.');

  let value = translations[language]?.[scope]?.[subKey]
    ?? translations['ko']?.[scope]?.[subKey]
    ?? key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }

  return value;
}

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(language, key, params);
  };

  return { t, language };
}

type Translator = (key: string, params?: Record<string, string | number>) => string;

const ERROR_MESSAGE_KEYS: Record<string, string> = {
  'uploader is not online': 'uploader_not_online',
  'downloader is not online': 'downloader_not_online',
  'share code not found': 'share_code_not_found',
  'this share is not configured for p2p transfer': 'not_p2p_share',
  'incorrect password for this share': 'incorrect_password',
  'incorrect password': 'incorrect_password',
  'password required': 'password_required',
  'file not found or expired': 'file_not_found_or_expired',
  'guest users can only use the 5-minute expiration': 'guest_expiration_limited',
  'sign in required for one-time download': 'signin_required_one_time',
  'sign in required for password protection': 'signin_required_password',
  'selected files are too large to download together': 'bulk_download_too_large',
  'upload failed': 'upload_failed',
  'invalid or missing upload signature': 'invalid_upload_signature',
  'missing x-storage-key header': 'upload_request_invalid',
  'missing storagekey': 'upload_request_invalid',
  'missing required headers': 'upload_request_invalid',
  'missing required fields': 'upload_request_invalid',
};

function lookupByMessage(message: string | undefined, t: Translator): string | undefined {
  if (!message) return undefined;
  const key = ERROR_MESSAGE_KEYS[message.trim().toLowerCase().replace(/\.+$/, '')];
  if (!key) return undefined;
  const full = `apiError.byMessage.${key}`;
  const v = t(full);
  return v !== full ? v : undefined;
}

export function translateSignalingError(message: string | undefined, t: Translator): string {
  return lookupByMessage(message, t) || t('p2p.connectionError');
}

const normalizeCode = (s: string): string =>
  s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function resolveByCode(code: string | undefined, t: Translator): string | undefined {
  if (!code) return undefined;
  for (const c of [code, normalizeCode(code)]) {
    const key = `apiError.byCode.${c}`;
    const v = t(key);
    if (v !== key) return v;
  }
  return undefined;
}

export function translateApiError(err: unknown, t: Translator): string {
  if (err == null) return t('common.unknownError');

  if (typeof err === 'string') {
    return lookupByMessage(err, t) ?? resolveByCode(err, t) ?? t('common.unknownError');
  }
  if (typeof err !== 'object') return t('common.unknownError');

  const e = err as { error?: unknown; message?: unknown };
  let code: string | undefined;
  let message: string | undefined;

  if (typeof e.error === 'string') {
    code = e.error;
    if (typeof e.message === 'string') message = e.message;
  } else if (e.error && typeof e.error === 'object') {
    const nested = e.error as { code?: unknown; message?: unknown };
    if (typeof nested.code === 'string') code = nested.code;
    if (typeof nested.message === 'string') message = nested.message;
  } else if (typeof e.message === 'string') {
    message = e.message;
  }

  const byMessage =
    lookupByMessage(message, t) ?? (typeof e.error === 'string' ? lookupByMessage(e.error, t) : undefined);
  if (byMessage) return byMessage;

  const byCode = resolveByCode(code, t);
  if (byCode) return byCode;

  return t('common.unknownError');
}
