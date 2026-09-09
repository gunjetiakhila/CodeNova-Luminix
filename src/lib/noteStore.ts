import type { NoteRecord, ReminderRecord } from '@/types';

const DB_NAME = 'localmind-notes';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';
const REMINDERS_STORE = 'reminders';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(REMINDERS_STORE)) {
        db.createObjectStore(REMINDERS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllNotes(): Promise<NoteRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const req = tx.objectStore(NOTES_STORE).getAll();
    req.onsuccess = () => resolve(req.result as NoteRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function putNote(note: NoteRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    tx.objectStore(NOTES_STORE).put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteNote(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    tx.objectStore(NOTES_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllReminders(): Promise<ReminderRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMINDERS_STORE, 'readonly');
    const req = tx.objectStore(REMINDERS_STORE).getAll();
    req.onsuccess = () => resolve(req.result as ReminderRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function putReminder(reminder: ReminderRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMINDERS_STORE, 'readwrite');
    tx.objectStore(REMINDERS_STORE).put(reminder);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMINDERS_STORE, 'readwrite');
    tx.objectStore(REMINDERS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
