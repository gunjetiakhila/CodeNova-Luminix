import type { MemoryRecord } from '@/types';

const DB_NAME = 'localmind-memory';
const STORE = 'memories';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllMemories(): Promise<MemoryRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const memories = (req.result as MemoryRecord[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(memories);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveMemory(content: string): Promise<MemoryRecord> {
  const now = Date.now();
  const memory: MemoryRecord = {
    id: crypto.randomUUID(),
    content,
    createdAt: now,
    updatedAt: now,
  };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(memory);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return memory;
}

export async function updateMemory(
  id: string,
  content: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as MemoryRecord | undefined;
      if (existing) {
        existing.content = content;
        existing.updatedAt = Date.now();
        store.put(existing);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function searchMemories(
  query: string
): Promise<MemoryRecord[]> {
  const all = await getAllMemories();
  const q = query.toLowerCase();
  return all.filter((m) => m.content.toLowerCase().includes(q));
}
