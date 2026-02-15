/**
 * Local Storage Service
 *
 * Provides a thin, typed wrapper around AsyncStorage for all user-data
 * collections (watchlist, watch-history, readlist, read-history).
 *
 * This is the LOCAL source of truth.  Contexts read from and write to
 * this layer only.  The SyncEngine is the single component that bridges
 * this layer ↔ Appwrite.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Storage Keys ───────────────────────────────────────────────────────
const KEYS = {
  WATCHLIST: '@kaizen_local_watchlist',
  WATCH_HISTORY: '@kaizen_local_watchhistory',
  READLIST: '@kaizen_local_readlist',
  READ_HISTORY: '@kaizen_local_readhistory',
  LAST_SYNC_TIME: '@kaizen_last_sync_time',
  SYNC_META: '@kaizen_sync_meta', // per-collection last-sync timestamps
  PENDING_CHANGES: '@kaizen_pending_changes', // changes made since last sync
  USER_ID: '@kaizen_local_user_id',
} as const;

export { KEYS as STORAGE_KEYS };

// ── Generic helpers ────────────────────────────────────────────────────

/**
 * Read a JSON array from AsyncStorage.  Returns [] on any error.
 */
async function readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`[LocalStorage] Failed to read ${key}:`, err);
    return [];
  }
}

/**
 * Write a JSON array to AsyncStorage.
 */
async function writeArray<T>(key: string, data: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[LocalStorage] Failed to write ${key}:`, err);
  }
}

/**
 * Read a simple JSON value.  Returns `fallback` on any error.
 */
async function readValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Write a simple JSON value.
 */
async function writeValue<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[LocalStorage] Failed to write ${key}:`, err);
  }
}

// ── Change Tracking (Pending Changes) ──────────────────────────────────

export type ChangeAction = 'upsert' | 'delete';

export interface PendingChange {
  collection: 'watchlist' | 'watchHistory' | 'readlist' | 'readHistory';
  action: ChangeAction;
  /** A unique key for the item (e.g. animeId for watchlist, animeId_ep_audio for history) */
  itemKey: string;
  /** Full item payload for upserts */
  payload?: any;
  timestamp: number;
}

async function getPendingChanges(): Promise<PendingChange[]> {
  return readArray<PendingChange>(KEYS.PENDING_CHANGES);
}

async function addPendingChange(change: Omit<PendingChange, 'timestamp'>): Promise<void> {
  const changes = await getPendingChanges();

  // De-duplicate: if there's already a change for the same collection+itemKey,
  // replace it (latest wins).  Exception: if the new action is 'delete', it
  // always supersedes an older 'upsert'.
  const idx = changes.findIndex(
    c => c.collection === change.collection && c.itemKey === change.itemKey,
  );

  const entry: PendingChange = { ...change, timestamp: Date.now() };

  if (idx >= 0) {
    changes[idx] = entry;
  } else {
    changes.push(entry);
  }

  await writeArray(KEYS.PENDING_CHANGES, changes);
}

async function clearPendingChanges(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PENDING_CHANGES);
}

async function clearPendingChangesForCollection(
  collection: PendingChange['collection'],
): Promise<void> {
  const changes = await getPendingChanges();
  const remaining = changes.filter(c => c.collection !== collection);
  await writeArray(KEYS.PENDING_CHANGES, remaining);
}

// ── Sync Metadata ──────────────────────────────────────────────────────

interface SyncMeta {
  watchlist: number;
  watchHistory: number;
  readlist: number;
  readHistory: number;
}

const DEFAULT_SYNC_META: SyncMeta = {
  watchlist: 0,
  watchHistory: 0,
  readlist: 0,
  readHistory: 0,
};

async function getSyncMeta(): Promise<SyncMeta> {
  return readValue<SyncMeta>(KEYS.SYNC_META, DEFAULT_SYNC_META);
}

async function setSyncMeta(meta: Partial<SyncMeta>): Promise<void> {
  const current = await getSyncMeta();
  await writeValue(KEYS.SYNC_META, { ...current, ...meta });
}

async function getLastSyncTime(): Promise<number> {
  return readValue<number>(KEYS.LAST_SYNC_TIME, 0);
}

async function setLastSyncTime(time: number): Promise<void> {
  await writeValue(KEYS.LAST_SYNC_TIME, time);
}

// ── User ID ────────────────────────────────────────────────────────────

async function getStoredUserId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_ID);
    return raw ?? null;
  } catch {
    return null;
  }
}

async function setStoredUserId(userId: string | null): Promise<void> {
  if (userId) {
    await AsyncStorage.setItem(KEYS.USER_ID, userId);
  } else {
    await AsyncStorage.removeItem(KEYS.USER_ID);
  }
}

// ── Clear All User Data ────────────────────────────────────────────────

async function clearAllUserData(): Promise<void> {
  const allKeys = Object.values(KEYS);
  await AsyncStorage.multiRemove(allKeys);
}

// ── Public API ─────────────────────────────────────────────────────────

const localStorage = {
  // Generic
  readArray,
  writeArray,
  readValue,
  writeValue,

  // Collection keys
  KEYS,

  // Watchlist
  getWatchlist: () => readArray<any>(KEYS.WATCHLIST),
  setWatchlist: (data: any[]) => writeArray(KEYS.WATCHLIST, data),

  // Watch History
  getWatchHistory: () => readArray<any>(KEYS.WATCH_HISTORY),
  setWatchHistory: (data: any[]) => writeArray(KEYS.WATCH_HISTORY, data),

  // Readlist
  getReadlist: () => readArray<any>(KEYS.READLIST),
  setReadlist: (data: any[]) => writeArray(KEYS.READLIST, data),

  // Read History
  getReadHistory: () => readArray<any>(KEYS.READ_HISTORY),
  setReadHistory: (data: any[]) => writeArray(KEYS.READ_HISTORY, data),

  // Pending changes
  getPendingChanges,
  addPendingChange,
  clearPendingChanges,
  clearPendingChangesForCollection,

  // Sync meta
  getSyncMeta,
  setSyncMeta,
  getLastSyncTime,
  setLastSyncTime,

  // User ID
  getStoredUserId,
  setStoredUserId,

  // Cleanup
  clearAllUserData,
};

export default localStorage;
