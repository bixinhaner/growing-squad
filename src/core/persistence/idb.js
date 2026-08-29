const DB_NAME = 'growing-squad-v1'
const DB_VERSION = 1
const SNAPSHOT_KEY = 'family-main'

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
  if (!db) return { snapshot: null, outbox: [] }
  const transaction = db.transaction(['snapshots', 'outbox'], 'readonly')
  const [snapshot, outbox] = await Promise.all([
    requestValue(transaction.objectStore('snapshots').get(SNAPSHOT_KEY)),
    requestValue(transaction.objectStore('outbox').getAll()),
  ])
  await transactionDone(transaction)
  db.close()
  return { snapshot: snapshot || null, outbox: (outbox || []).sort((a, b) => Number(a.operation?.clientSequence || 0) - Number(b.operation?.clientSequence || 0)) }
}

export async function saveSnapshotAndOutbox(snapshot, outbox) {
  const db = await openDatabase()
  if (!db) return
  const transaction = db.transaction(['snapshots', 'outbox'], 'readwrite')
  transaction.objectStore('snapshots').put(snapshot, SNAPSHOT_KEY)
  const store = transaction.objectStore('outbox')
  store.clear()
  outbox.forEach((item) => store.put(item))
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

