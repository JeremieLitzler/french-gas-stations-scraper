/**
 * Thin Promise-based wrapper around the native IndexedDB API.
 *
 * Exposes three operations: get, set, del.
 * The IDBDatabase connection is cached at module level so it is opened
 * once per page load and reused on every subsequent call (ADR-008).
 *
 * Known limitations (documented in ADR-008):
 * - No onblocked handler for schema upgrade across tabs.
 * - No cursor or index support — keyed get/set/delete only.
 */

const DB_NAME = 'french-gas-stations'
const DB_VERSION = 1
const STORE_NAME = 'keyval'

let cachedDatabase: IDBDatabase | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (cachedDatabase !== null) return Promise.resolve(cachedDatabase)
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION)
    openRequest.onupgradeneeded = () => {
      openRequest.result.createObjectStore(STORE_NAME)
    }
    openRequest.onsuccess = () => {
      cachedDatabase = openRequest.result
      resolve(cachedDatabase)
    }
    openRequest.onerror = () => reject(openRequest.error)
  })
}

function runTransaction(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> {
  return openDatabase().then((database) => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)
      const request = operation(store)
      if (mode === 'readonly') {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        return
      }
      let requestResult: unknown
      request.onsuccess = () => {
        requestResult = request.result
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'))
      }
      transaction.oncomplete = () => resolve(requestResult)
      transaction.onerror = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction error'))
      }
      transaction.onabort = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
      }
    })
  })
}

export function get<T>(key: string): Promise<T | undefined> {
  return runTransaction('readonly', (store) => store.get(key)) as Promise<T | undefined>
}

export function set(key: string, value: unknown): Promise<void> {
  return runTransaction('readwrite', (store) => store.put(value, key)) as Promise<void>
}

export function del(key: string): Promise<void> {
  return runTransaction('readwrite', (store) => store.delete(key)) as Promise<void>
}

/** Reset the cached connection — used in tests that need a fresh database. */
export function resetDatabaseConnection(): void {
  cachedDatabase = null
}
