const DB_NAME = 'ShareAnythingUpload';
const STORE_NAME = 'pendingFiles';
const DB_VERSION = 1;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'index' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeUploadFiles(files: File[]): Promise<void> {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) return;

  try {
    const fileData = await Promise.all(
      files.map(async (file, index) => ({
        index,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        data: await file.arrayBuffer(),
      }))
    );

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    for (const item of fileData) {
      store.put(item);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch {
    // Silently fail - graceful degradation
  }
}

export async function restoreUploadFiles(): Promise<File[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    const items = await new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    return items
      .sort((a, b) => a.index - b.index)
      .map(item => new File([item.data], item.name, {
        type: item.type,
        lastModified: item.lastModified,
      }));
  } catch {
    return [];
  }
}

export async function clearUploadFiles(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Silently fail
  }
}
