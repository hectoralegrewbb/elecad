const databaseName = 'elcad';
const storeName = 'documents';
const autosaveKey = 'autosave';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runRequest(mode, createRequest) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = createRequest(transaction.objectStore(storeName));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = transaction.onerror;
  });
}

export const saveAutosave = (state) => runRequest('readwrite', (store) => store.put({ savedAt: Date.now(), state }, autosaveKey));

export const loadAutosave = () => runRequest('readonly', (store) => store.get(autosaveKey));

export const clearAutosave = () => runRequest('readwrite', (store) => store.delete(autosaveKey));
