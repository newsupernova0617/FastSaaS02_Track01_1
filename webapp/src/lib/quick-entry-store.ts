export type QuickEntryRegistration = {
  userId: string;
  subscriptionId: string;
  quickEntryToken: string;
  updatedAt: string;
};

const DB_NAME = 'easy-ai-budget-webapp';
const STORE_NAME = 'kv';
const STORE_KEY = 'quick-entry-registration';

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    Promise.resolve(handler(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error ?? new Error('IndexedDB request failed'));
        } else {
          resolve(result);
        }
      })
      .catch(reject)
      .finally(() => {
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
      });
  });
}

export async function setQuickEntryRegistration(value: QuickEntryRegistration | null): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = value ? store.put(value, STORE_KEY) : store.delete(STORE_KEY);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function getQuickEntryRegistration(): Promise<QuickEntryRegistration | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STORE_KEY);
    request.onsuccess = () => resolve((request.result as QuickEntryRegistration | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

export async function clearQuickEntryRegistration(): Promise<void> {
  await setQuickEntryRegistration(null);
}
