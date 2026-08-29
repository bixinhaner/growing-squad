const DB_NAME = 'growing-squad-v1'
const DB_VERSION = 2
const SNAPSHOT_KEY = 'family-main'
const SYNC_META_KEY = 'family-main'

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots')
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('changes')) db.createObjectStore('changes', { keyPath: 'serverSequence' })
      if (!db.objectStoreNames.contains('devicePreferences')) db.createObjectStore('devicePreferences')
      if (!db.objectStoreNames.contains('mediaDrafts')) db.createObjectStore('mediaDrafts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('migrationBackups')) db.createObjectStore('migrationBackups')
      if (!db.objectStoreNames.contains('syncMeta')) db.createObjectStore('syncMeta')
      if (!db.objectStoreNames.contains('conflicts')) db.createObjectStore('conflicts', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function loadIndexedPersistence() {
  const db = await openDatabase()
  if (!db) return { snapshot: null, outbox: [], cursor: 0, conflicts: [] }
  const transaction = db.transaction(['snapshots', 'outbox', 'syncMeta', 'conflicts'], 'readonly')
  const [snapshot, outbox, syncMeta, conflicts] = await Promise.all([
    requestValue(transaction.objectStore('snapshots').get(SNAPSHOT_KEY)),
    requestValue(transaction.objectStore('outbox').getAll()),
    requestValue(transaction.objectStore('syncMeta').get(SYNC_META_KEY)),
    requestValue(transaction.objectStore('conflicts').getAll()),
  ])
  await transactionDone(transaction)
  db.close()
  return {
    snapshot: snapshot || null,
    outbox: (outbox || []).sort((a, b) => Number(a.operation?.clientSequence || 0) - Number(b.operation?.clientSequence || 0)),
    cursor: Number(syncMeta?.cursor || 0),
    conflicts: (conflicts || []).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)),
  }
}

export async function saveSnapshotAndOutbox(snapshot, outbox, { cursor } = {}) {
  const db = await openDatabase()
  if (!db) return
  const stores = cursor === undefined ? ['snapshots', 'outbox'] : ['snapshots', 'outbox', 'syncMeta']
  const transaction = db.transaction(stores, 'readwrite')
  transaction.objectStore('snapshots').put(snapshot, SNAPSHOT_KEY)
  const store = transaction.objectStore('outbox')
  store.clear()
  outbox.forEach((item) => store.put(item))
  if (cursor !== undefined) transaction.objectStore('syncMeta').put({ cursor: Number(cursor) || 0, updatedAt: Date.now() }, SYNC_META_KEY)
  await transactionDone(transaction)
  db.close()
}

export async function commitOperation(snapshot, item) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction(['snapshots', 'outbox'], 'readwrite')
  transaction.objectStore('snapshots').put(snapshot, SNAPSHOT_KEY)
  transaction.objectStore('outbox').put(item)
  await transactionDone(transaction)
  db.close()
}

export async function saveConflicts(conflicts) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction('conflicts', 'readwrite')
  const store = transaction.objectStore('conflicts')
  store.clear()
  conflicts.forEach((item) => store.put(item))
  await transactionDone(transaction)
  db.close()
}

export async function clearConflict(id) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction('conflicts', 'readwrite')
  transaction.objectStore('conflicts').delete(id)
  await transactionDone(transaction)
  db.close()
}

export async function storeChanges(changes, cursor) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction(['changes', 'syncMeta'], 'readwrite')
  const store = transaction.objectStore('changes')
  changes.forEach((change) => store.put(change))
  transaction.objectStore('syncMeta').put({ cursor: Number(cursor) || 0, updatedAt: Date.now() }, SYNC_META_KEY)
  await transactionDone(transaction)
  db.close()
}

export async function putMediaDraft(draft) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction('mediaDrafts', 'readwrite')
  transaction.objectStore('mediaDrafts').put(draft)
  await transactionDone(transaction)
  db.close()
}

export async function getMediaDraft(id) {
  const db = await openDatabase()
  if (!db) return null
  const transaction = db.transaction('mediaDrafts', 'readonly')
  const value = await requestValue(transaction.objectStore('mediaDrafts').get(id))
  await transactionDone(transaction)
  db.close()
  return value || null
}

export async function listMediaDrafts() {
  const db = await openDatabase()
  if (!db) return []
  const transaction = db.transaction('mediaDrafts', 'readonly')
  const values = await requestValue(transaction.objectStore('mediaDrafts').getAll())
  await transactionDone(transaction)
  db.close()
  return values || []
}

export async function deleteMediaDraft(id) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction('mediaDrafts', 'readwrite')
  transaction.objectStore('mediaDrafts').delete(id)
  await transactionDone(transaction)
  db.close()
}

export async function clearIndexedPersistence() {
  if (typeof indexedDB === 'undefined') return
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}
