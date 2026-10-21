import { adminFirestore } from '@/lib/firebase/admin'
import { DbClient } from './client'
import { FirestoreStore } from './firestore-store'
import type { DocStore } from './store'

let store: FirestoreStore | null = null

/**
 * The process-wide Firestore-backed store. Firestore (and its credentials) are only
 * touched when a query runs, so a missing key surfaces as a query error, not a crash.
 */
export function getStore(): DocStore {
  if (!store) store = new FirestoreStore(adminFirestore)
  return store
}

/**
 * Service-role database client without auth/storage facades. For internal use by the
 * auth layer; app code should use createAdminClient() from '@/lib/db/server'.
 */
export function createServiceDb(): DbClient<null, null> {
  return new DbClient({
    store: getStore(),
    resolveActor: async () => ({ kind: 'service' }),
    auth: null,
    storage: null,
  })
}
