/**
 * Tests for the indexedDb utility.
 *
 * The module-level cachedDatabase is reset between tests via
 * resetDatabaseConnection() so each test gets a fresh open sequence.
 *
 * The global indexedDB is replaced with a minimal fake that lets us
 * exercise the error and abort paths — including the case where
 * transaction.error is null (the root cause of the "Could not save" bug).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Helpers to build fake IDB objects
// ---------------------------------------------------------------------------

type IDBEventCallback = ((this: unknown, ev: Event) => void) | null

interface FakeRequest {
  result: unknown
  error: DOMException | null
  onsuccess: IDBEventCallback
  onerror: IDBEventCallback
}

interface FakeTransaction {
  error: DOMException | null
  oncomplete: IDBEventCallback
  onerror: IDBEventCallback
  onabort: IDBEventCallback
  objectStore: () => FakeStore
}

interface FakeStore {
  get: (key: string) => FakeRequest
  put: (value: unknown, key: string) => FakeRequest
  delete: (key: string) => FakeRequest
}

function makeFakeStore(request: FakeRequest): FakeStore {
  return {
    get: () => request,
    put: () => request,
    delete: () => request,
  }
}

function makeFakeTransaction(request: FakeRequest): FakeTransaction {
  const tx: FakeTransaction = {
    error: null,
    oncomplete: null,
    onerror: null,
    onabort: null,
    objectStore: () => makeFakeStore(request),
  }
  return tx
}

function makeFakeOpenRequest(db: FakeDatabaseHandle): {
  result: FakeDatabaseHandle
  error: DOMException | null
  onupgradeneeded: IDBEventCallback
  onsuccess: IDBEventCallback
  onerror: IDBEventCallback
} {
  return {
    result: db,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }
}

interface FakeDatabaseHandle {
  transaction: (store: string, mode: string) => FakeTransaction
  createObjectStore?: () => FakeStore
}

// ---------------------------------------------------------------------------
// Re-import the module fresh before each test
// ---------------------------------------------------------------------------

beforeEach(async () => {
  vi.resetModules()
})

// ---------------------------------------------------------------------------
// TC-IDB-01: get() resolves with the stored value on success
// ---------------------------------------------------------------------------

describe('TC-IDB-01: get() resolves with the stored value on success', () => {
  it('returns the value from the IDB get request', async () => {
    const fakeRequest: FakeRequest = { result: ['station-a'], error: null, onsuccess: null, onerror: null }
    const fakeTx = makeFakeTransaction(fakeRequest)
    const fakeDb: FakeDatabaseHandle = { transaction: () => fakeTx }
    const fakeOpenRequest = makeFakeOpenRequest(fakeDb)

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onsuccess?.call(null, new Event('success')))
        return fakeOpenRequest
      },
    })

    const { get, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    const promise = get('stations')

    // Resolve the open then the get request
    await new Promise((r) => setTimeout(r))
    fakeRequest.onsuccess?.call(null, new Event('success'))

    await expect(promise).resolves.toEqual(['station-a'])
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// TC-IDB-02: set() resolves when transaction completes normally
// ---------------------------------------------------------------------------

describe('TC-IDB-02: set() resolves when the readwrite transaction completes', () => {
  it('resolves after transaction.oncomplete fires', async () => {
    const fakeRequest: FakeRequest = { result: 'stations', error: null, onsuccess: null, onerror: null }
    const fakeTx = makeFakeTransaction(fakeRequest)
    const fakeDb: FakeDatabaseHandle = { transaction: () => fakeTx }
    const fakeOpenRequest = makeFakeOpenRequest(fakeDb)

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onsuccess?.call(null, new Event('success')))
        return fakeOpenRequest
      },
    })

    const { set, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    const promise = set('stations', [{ name: 'A', url: 'https://www.prix-carburants.gouv.fr/station/1' }])

    // Resolve open, then request success, then transaction complete
    await new Promise((r) => setTimeout(r))
    fakeRequest.onsuccess?.call(null, new Event('success'))
    fakeTx.oncomplete?.call(null, new Event('complete'))

    // set() casts to Promise<void>; resolving with any value (e.g. the key) is acceptable
    await expect(promise).resolves.not.toThrow()
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// TC-IDB-03: set() rejects with a proper Error when transaction aborts with null error
// ---------------------------------------------------------------------------

describe('TC-IDB-03: set() rejects with an Error when transaction.onabort fires with null error', () => {
  it('rejects with a non-null Error (not null) so catch blocks can handle it properly', async () => {
    const fakeRequest: FakeRequest = { result: undefined, error: null, onsuccess: null, onerror: null }
    const fakeTx = makeFakeTransaction(fakeRequest)
    fakeTx.error = null // simulate null error on abort
    const fakeDb: FakeDatabaseHandle = { transaction: () => fakeTx }
    const fakeOpenRequest = makeFakeOpenRequest(fakeDb)

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onsuccess?.call(null, new Event('success')))
        return fakeOpenRequest
      },
    })

    const { set, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    const promise = set('stations', [])

    // Resolve open, then fire onabort with null error
    await new Promise((r) => setTimeout(r))
    fakeTx.onabort?.call(null, new Event('abort'))

    await expect(promise).rejects.toBeInstanceOf(Error)
    await expect(promise).rejects.toThrow('IndexedDB transaction aborted')
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// TC-IDB-04: set() rejects with the actual error when transaction.onerror fires
// ---------------------------------------------------------------------------

describe('TC-IDB-04: set() rejects with transaction.error when transaction.onerror fires', () => {
  it('rejects with the DOMException from the transaction error', async () => {
    const fakeRequest: FakeRequest = { result: undefined, error: null, onsuccess: null, onerror: null }
    const fakeTx = makeFakeTransaction(fakeRequest)
    const txError = new DOMException('QuotaExceededError', 'QuotaExceededError')
    fakeTx.error = txError
    const fakeDb: FakeDatabaseHandle = { transaction: () => fakeTx }
    const fakeOpenRequest = makeFakeOpenRequest(fakeDb)

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onsuccess?.call(null, new Event('success')))
        return fakeOpenRequest
      },
    })

    const { set, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    const promise = set('stations', [])

    await new Promise((r) => setTimeout(r))
    fakeTx.onerror?.call(null, new Event('error'))

    await expect(promise).rejects.toBe(txError)
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// TC-IDB-05: set() rejects with request.error when request.onerror fires
// ---------------------------------------------------------------------------

describe('TC-IDB-05: set() rejects with request.error when request.onerror fires', () => {
  it('rejects with the DOMException from the request error', async () => {
    const reqError = new DOMException('DataError', 'DataError')
    const fakeRequest: FakeRequest = { result: undefined, error: reqError, onsuccess: null, onerror: null }
    const fakeTx = makeFakeTransaction(fakeRequest)
    const fakeDb: FakeDatabaseHandle = { transaction: () => fakeTx }
    const fakeOpenRequest = makeFakeOpenRequest(fakeDb)

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onsuccess?.call(null, new Event('success')))
        return fakeOpenRequest
      },
    })

    const { set, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    const promise = set('stations', [])

    await new Promise((r) => setTimeout(r))
    fakeRequest.onerror?.call(null, new Event('error'))

    await expect(promise).rejects.toBe(reqError)
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// TC-IDB-06: set() rejects with a fallback Error when request.error is null
// ---------------------------------------------------------------------------

describe('TC-IDB-06: set() rejects with a fallback Error when request.error is null on onerror', () => {
  it('rejects with "IndexedDB request failed" when request.error is null', async () => {
    const fakeRequest: FakeRequest = { result: undefined, error: null, onsuccess: null, onerror: null }
    const fakeTx = makeFakeTransaction(fakeRequest)
    const fakeDb: FakeDatabaseHandle = { transaction: () => fakeTx }
    const fakeOpenRequest = makeFakeOpenRequest(fakeDb)

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onsuccess?.call(null, new Event('success')))
        return fakeOpenRequest
      },
    })

    const { set, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    const promise = set('stations', [])

    await new Promise((r) => setTimeout(r))
    fakeRequest.onerror?.call(null, new Event('error'))

    await expect(promise).rejects.toBeInstanceOf(Error)
    await expect(promise).rejects.toThrow('IndexedDB request failed')
    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// TC-IDB-07: openDatabase() rejects when open request fails
// ---------------------------------------------------------------------------

describe('TC-IDB-07: openDatabase() rejects when the IDB open request fails', () => {
  it('rejects set() with the open request error', async () => {
    const openError = new Error('IDB open failed')
    const fakeOpenRequest = {
      result: null,
      error: openError,
      onupgradeneeded: null as IDBEventCallback,
      onsuccess: null as IDBEventCallback,
      onerror: null as IDBEventCallback,
    }

    vi.stubGlobal('indexedDB', {
      open: () => {
        setTimeout(() => fakeOpenRequest.onerror?.call(null, new Event('error')))
        return fakeOpenRequest
      },
    })

    const { set, resetDatabaseConnection } = await import('./indexedDb')
    resetDatabaseConnection()

    // Attach a no-op catch immediately so the rejection is never unhandled,
    // then drive the async fake forward and assert.
    let caughtError: unknown
    const promise = set('stations', []).catch((err: unknown) => {
      caughtError = err
    })

    await new Promise((r) => setTimeout(r))
    await promise

    expect(caughtError).toBe(openError)
    vi.unstubAllGlobals()
  })
})
