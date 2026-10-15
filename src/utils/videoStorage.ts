// Persistent IndexedDB and storage helper for student exam video recordings

const DB_NAME = 'eduzone_cbt_recordings_db';
const DB_VERSION = 1;
const STORE_NAME = 'exam_recordings';

export interface SavedVideoRecording {
  id: string;
  nama: string;
  durasiDetik: number;
  url: string;
  sizeMb: string;
  tanggal: string;
  blob?: Blob;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVideoRecordingToIndexedDB(
  rec: SavedVideoRecording,
  videoBlob?: Blob
): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const itemToSave = {
      id: rec.id,
      nama: rec.nama,
      durasiDetik: rec.durasiDetik,
      sizeMb: rec.sizeMb,
      tanggal: rec.tanggal,
      blob: videoBlob || rec.blob,
      savedAt: new Date().toISOString(),
    };
    store.put(itemToSave);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function getAllVideoRecordingsFromIndexedDB(): Promise<SavedVideoRecording[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result || [];
        const items: SavedVideoRecording[] = results.map((r: any) => {
          let objectUrl = '';
          if (r.blob && r.blob instanceof Blob) {
            try {
              objectUrl = URL.createObjectURL(r.blob);
            } catch {}
          }
          return {
            id: r.id,
            nama: r.nama,
            durasiDetik: r.durasiDetik,
            sizeMb: r.sizeMb,
            tanggal: r.tanggal,
            url: objectUrl,
            blob: r.blob,
          };
        });
        resolve(items);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteVideoRecordingFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function clearAllVideoRecordingsFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
