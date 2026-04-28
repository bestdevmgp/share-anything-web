const STORAGE_KEY = 'device_id';

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const ensureDeviceId = (): string => {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUuid();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateUuid();
  }
};
