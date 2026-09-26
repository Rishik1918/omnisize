/**
 * Lightweight IndexedDB persistence for PDF Studio editing sessions.
 * Preserves documents and edits seamlessly across app switches without draining RAM or battery.
 */

const DB_NAME = 'omnisize_pdf_session_db';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface ActivePdfSession {
  fileName: string;
  fileType: string;
  fileBuffer: ArrayBuffer;
  currentPage: number;
  pageRotations: Record<number, number>;
  deletedPages: number[];
  insertedBlankPages: any[];
  textOverlays: any[];
  imageOverlays: any[];
  shapes: any[];
  tables: any[];
  modifiedTexts: any[];
  hyperlinks: any[];
  updatedAt: number;
}

export async function saveActivePdfSession(session: ActivePdfSession): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(session, 'active_session');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn('Failed to persist active PDF session:', e);
  }
}

export async function loadActivePdfSession(): Promise<ActivePdfSession | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('active_session');
      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (e) {
    return null;
  }
}

export async function clearActivePdfSession(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('active_session');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch (e) {}
}
