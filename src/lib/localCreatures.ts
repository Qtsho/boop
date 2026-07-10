import type { StoredCreature } from '../types';

const DB_NAME = 'boop-local-creatures';
const DB_VERSION = 1;
const STORE_NAME = 'creatures';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support private local media storage.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'));
  });
}

export async function saveCreature(creature: StoredCreature): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(creature);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this creature.'));
  });
  database.close();
}

export async function loadCreatures(): Promise<StoredCreature[]> {
  const database = await openDatabase();
  const creatures = await new Promise<StoredCreature[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredCreature[]);
    request.onerror = () => reject(request.error ?? new Error('Could not read local creatures.'));
  });
  database.close();
  return creatures.sort((a, b) => b.createdAt - a.createdAt);
}
