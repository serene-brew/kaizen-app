/**
 * Sync Engine
 *
 * The ONLY module that talks to Appwrite for user-data collections.
 * Every other part of the app reads/writes through localStorage.ts.
 *
 * Responsibilities:
 *   1. Daily automatic sync (push local → cloud, pull cloud → local)
 *   2. Manual sync triggered by user (sync buttons)
 *   3. Initial bootstrap on first login (pull cloud → local)
 *   4. Deduplication during sync (replaces the old cleanupAllUserDuplicates)
 *   5. Pending-change tracking so nothing is lost between syncs
 *
 * Design principles:
 *   - Merge strategy: most-recent-timestamp wins
 *   - Deletes are tracked as pending changes and applied during sync
 *   - Collections are synced independently; one failure doesn't block others
 *   - 24-hour cooldown for automatic sync (configurable)
 */

import { databases, account } from './appwrite';
import { ID, Query, Permission, Role } from 'appwrite';
import Constants from 'expo-constants';
import localStorage, { PendingChange } from './localStorage';
import type { WatchHistoryItem } from '../contexts/WatchHistoryContext';
import type { WatchlistItem } from '../contexts/WatchlistContext';
import type { ReadlistItem } from '../contexts/ReadlistContext';
import type { ReadHistoryItem } from '../contexts/ReadHistoryContext';

// ── Appwrite IDs ───────────────────────────────────────────────────────

const DB_ID = Constants.expoConfig?.extra?.appwriteDatabaseId as string;
const COLLECTION_IDS = {
  watchlist: Constants.expoConfig?.extra?.appwriteWatchlistCollectionId as string,
  watchHistory: Constants.expoConfig?.extra?.appwriteWatchHistoryCollectionId as string,
  readlist: Constants.expoConfig?.extra?.appwriteReadlistCollectionId as string,
  readHistory: Constants.expoConfig?.extra?.appwriteReadHistoryCollectionId as string,
};

// ── Configuration ──────────────────────────────────────────────────────

/** Minimum milliseconds between automatic syncs (24 hours). */
const AUTO_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

/** Page size for Appwrite pagination (max 100). */
const PAGE_LIMIT = 100;

/** Delay between Appwrite write operations to avoid rate limits. */
const WRITE_DELAY_MS = 200;

// ── Types ──────────────────────────────────────────────────────────────

type CollectionName = 'watchlist' | 'watchHistory' | 'readlist' | 'readHistory';

interface SyncResult {
  collection: CollectionName;
  success: boolean;
  pulled: number;
  pushed: number;
  deleted: number;
  errors: string[];
}

interface FullSyncResult {
  results: SyncResult[];
  syncTime: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function userPermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

/**
 * Fetch ALL documents for a user from a single Appwrite collection.
 * Uses cursor-based pagination to handle large datasets.
 */
async function fetchAllDocuments(collectionId: string, userId: string): Promise<any[]> {
  const allDocs: any[] = [];
  let lastId: string | null = null;

  while (true) {
    const queries = [
      Query.equal('userId', userId),
      Query.limit(PAGE_LIMIT),
    ];
    if (lastId) queries.push(Query.cursorAfter(lastId));

    const response = await databases.listDocuments(DB_ID, collectionId, queries);

    if (response.documents.length === 0) break;
    allDocs.push(...response.documents);

    if (response.documents.length < PAGE_LIMIT) break;
    lastId = response.documents[response.documents.length - 1].$id;
  }

  return allDocs;
}

// ── Cloud → Local mapping helpers ──────────────────────────────────────

function cloudDocToWatchlist(doc: any): WatchlistItem {
  return {
    id: doc.animeId,
    englishName: doc.englishName,
    thumbnailUrl: doc.thumbnailUrl,
    dateAdded: typeof doc.dateAdded === 'string' ? new Date(doc.dateAdded).getTime()
      : typeof doc.dateAdded === 'number' ? doc.dateAdded : Date.now(),
    documentId: doc.$id,
  };
}

function cloudDocToWatchHistory(doc: any): WatchHistoryItem {
  return {
    id: doc.animeId,
    episodeNumber: doc.episodeNumber,
    audioType: doc.audioType,
    englishName: doc.englishName,
    thumbnailUrl: doc.thumbnailUrl,
    watchedAt: typeof doc.watchedAt === 'number' ? doc.watchedAt : Date.now(),
    position: doc.position ?? 0,
    duration: doc.duration ?? 0,
    documentId: doc.$id,
  };
}

function cloudDocToReadlist(doc: any): ReadlistItem {
  const rawDate = doc.dateAdded;
  return {
    id: doc.mangaId,
    title: doc.title,
    thumbnailUrl: doc.thumbnailUrl,
    dateAdded: typeof rawDate === 'string' ? new Date(rawDate).getTime()
      : typeof rawDate === 'number' ? rawDate : Date.now(),
    documentId: doc.$id,
  };
}

function cloudDocToReadHistory(doc: any): ReadHistoryItem {
  const readAt = typeof doc.readAt === 'string' ? new Date(doc.readAt).getTime()
    : typeof doc.readAt === 'number' ? doc.readAt : Date.now();
  const totalPages = typeof doc.totalPages === 'number' ? Math.max(0, Math.round(doc.totalPages)) : 0;
  const rawPage = typeof doc.page === 'number' ? Math.round(doc.page) : 0;
  const page = totalPages > 0 ? Math.min(Math.max(rawPage, 1), totalPages) : Math.max(rawPage, 0);
  const chapterNumber = doc.chapterNumber ?? doc.chapter ?? doc.chapterId ?? 0;

  return {
    id: doc.mangaId,
    chapter: String(chapterNumber ?? ''),
    title: doc.title,
    thumbnailUrl: doc.thumbnailUrl,
    page,
    totalPages,
    readAt,
    documentId: doc.$id,
  };
}

// ── Local → Cloud payload helpers ──────────────────────────────────────

function watchlistToPayload(item: WatchlistItem, userId: string) {
  return {
    userId,
    animeId: item.id,
    englishName: item.englishName,
    thumbnailUrl: item.thumbnailUrl || '',
    dateAdded: item.dateAdded,
  };
}

function watchHistoryToPayload(item: WatchHistoryItem, userId: string) {
  return {
    userId,
    animeId: item.id,
    episodeNumber: item.episodeNumber,
    audioType: item.audioType,
    englishName: item.englishName,
    thumbnailUrl: item.thumbnailUrl,
    watchedAt: item.watchedAt,
    position: Math.floor(item.position),
    duration: Math.floor(item.duration),
  };
}

function readlistToPayload(item: ReadlistItem, userId: string) {
  return {
    userId,
    mangaId: item.id,
    title: item.title || 'Unknown Manga',
    thumbnailUrl: item.thumbnailUrl || '',
    dateAdded: new Date(item.dateAdded).toISOString(),
  };
}

function readHistoryToPayload(item: ReadHistoryItem, userId: string) {
  const chapterNumber = parseFloat(item.chapter);
  return {
    userId,
    mangaId: item.id,
    title: item.title || 'Unknown Manga',
    thumbnailUrl: item.thumbnailUrl || '',
    page: item.page ?? 0,
    totalPages: item.totalPages ?? 0,
    readAt: new Date(item.readAt).toISOString(),
    chapterNumber: Number.isFinite(chapterNumber) ? chapterNumber : 0,
  };
}

// ── Unique key extractors ──────────────────────────────────────────────

function watchlistKey(item: WatchlistItem): string {
  return item.id;
}

function watchHistoryKey(item: WatchHistoryItem): string {
  return `${item.id}_${item.episodeNumber}_${item.audioType}`;
}

function readlistKey(item: ReadlistItem): string {
  return item.id;
}

function readHistoryKey(item: ReadHistoryItem): string {
  return `${item.id}_${item.chapter}`;
}

// ── Timestamp extractors ──────────────────────────────────────────────

function watchlistTimestamp(item: WatchlistItem): number {
  return item.dateAdded;
}

function watchHistoryTimestamp(item: WatchHistoryItem): number {
  return item.watchedAt;
}

function readlistTimestamp(item: ReadlistItem): number {
  return item.dateAdded;
}

function readHistoryTimestamp(item: ReadHistoryItem): number {
  return item.readAt;
}

// ── Generic Bidirectional Merge ────────────────────────────────────────

/**
 * Merge local and cloud items.
 *
 * Strategy:
 *   - For items that exist in both, keep the one with the latest timestamp.
 *   - Items only in local → need to be pushed to cloud.
 *   - Items only in cloud → need to be pulled to local.
 *   - Pending deletes from local → remove from cloud.
 *
 * Returns the merged set, plus lists of what needs to be pushed/deleted.
 */
function mergeItems<T>(
  localItems: T[],
  cloudItems: T[],
  keyFn: (item: T) => string,
  timestampFn: (item: T) => number,
  pendingDeletes: Set<string>,
): {
  merged: T[];
  toPush: T[];   // items to push to cloud (new or newer local versions)
  toDeleteFromCloud: T[]; // items to delete from cloud
} {
  const localMap = new Map<string, T>();
  const cloudMap = new Map<string, T>();

  for (const item of localItems) {
    const key = keyFn(item);
    // Deduplicate: keep the one with the latest timestamp
    const existing = localMap.get(key);
    if (!existing || timestampFn(item) > timestampFn(existing)) {
      localMap.set(key, item);
    }
  }

  for (const item of cloudItems) {
    const key = keyFn(item);
    const existing = cloudMap.get(key);
    if (!existing || timestampFn(item) > timestampFn(existing)) {
      cloudMap.set(key, item);
    }
  }

  const merged: T[] = [];
  const toPush: T[] = [];
  const toDeleteFromCloud: T[] = [];
  const processedKeys = new Set<string>();

  // Process local items
  for (const [key, localItem] of localMap) {
    processedKeys.add(key);

    // If this item was deleted locally, mark for cloud deletion
    if (pendingDeletes.has(key)) {
      const cloudItem = cloudMap.get(key);
      if (cloudItem) {
        toDeleteFromCloud.push(cloudItem);
      }
      continue; // Don't add to merged
    }

    const cloudItem = cloudMap.get(key);

    if (!cloudItem) {
      // Only in local → push to cloud
      merged.push(localItem);
      toPush.push(localItem);
    } else {
      // In both → keep the newer one
      if (timestampFn(localItem) >= timestampFn(cloudItem)) {
        merged.push(localItem);
        toPush.push(localItem); // Push local version to cloud
      } else {
        merged.push(cloudItem);
        // Cloud version is newer, no need to push
      }
    }
  }

  // Process cloud-only items
  for (const [key, cloudItem] of cloudMap) {
    if (processedKeys.has(key)) continue;

    // If this item was deleted locally, mark for cloud deletion
    if (pendingDeletes.has(key)) {
      toDeleteFromCloud.push(cloudItem);
      continue;
    }

    // Only in cloud → pull to local
    merged.push(cloudItem);
  }

  return { merged, toPush, toDeleteFromCloud };
}

// ── Collection-specific sync functions ─────────────────────────────────

async function syncWatchlist(userId: string, pendingChanges: PendingChange[]): Promise<SyncResult> {
  const result: SyncResult = { collection: 'watchlist', success: false, pulled: 0, pushed: 0, deleted: 0, errors: [] };

  try {
    const localItems: WatchlistItem[] = await localStorage.getWatchlist();
    const cloudDocs = await fetchAllDocuments(COLLECTION_IDS.watchlist, userId);
    const cloudItems = cloudDocs.map(cloudDocToWatchlist);

    const pendingDeletes = new Set(
      pendingChanges
        .filter(c => c.collection === 'watchlist' && c.action === 'delete')
        .map(c => c.itemKey)
    );

    const { merged, toPush, toDeleteFromCloud } = mergeItems(
      localItems, cloudItems, watchlistKey, watchlistTimestamp, pendingDeletes,
    );

    // Push new/updated items to cloud
    for (const item of toPush) {
      try {
        const existing = cloudItems.find(c => watchlistKey(c) === watchlistKey(item));
        if (existing?.documentId) {
          // Update existing cloud document
          await databases.updateDocument(DB_ID, COLLECTION_IDS.watchlist, existing.documentId, watchlistToPayload(item, userId));
        } else {
          // Create new cloud document
          const response = await databases.createDocument(
            DB_ID, COLLECTION_IDS.watchlist, ID.unique(),
            watchlistToPayload(item, userId),
            userPermissions(userId),
          );
          // Update documentId in merged set
          const mergedItem = merged.find(m => watchlistKey(m) === watchlistKey(item));
          if (mergedItem) (mergedItem as any).documentId = response.$id;
        }
        result.pushed++;
        await delay(WRITE_DELAY_MS);
      } catch (err: any) {
        result.errors.push(`Push watchlist ${item.id}: ${err.message}`);
      }
    }

    // Delete items from cloud
    for (const item of toDeleteFromCloud) {
      try {
        if ((item as any).documentId) {
          await databases.deleteDocument(DB_ID, COLLECTION_IDS.watchlist, (item as any).documentId);
          result.deleted++;
          await delay(WRITE_DELAY_MS);
        }
      } catch (err: any) {
        if (!err.message?.includes('could not be found')) {
          result.errors.push(`Delete watchlist ${item.id}: ${err.message}`);
        }
      }
    }

    // Delete duplicate documents in cloud (items that appear more than once)
    const docIds = new Map<string, string[]>();
    for (const doc of cloudDocs) {
      const key = doc.animeId;
      if (!docIds.has(key)) docIds.set(key, []);
      docIds.get(key)!.push(doc.$id);
    }
    for (const [_key, ids] of docIds) {
      if (ids.length > 1) {
        // Keep the first, delete the rest
        for (let i = 1; i < ids.length; i++) {
          try {
            await databases.deleteDocument(DB_ID, COLLECTION_IDS.watchlist, ids[i]);
            result.deleted++;
            await delay(WRITE_DELAY_MS);
          } catch (err: any) {
            if (!err.message?.includes('could not be found')) {
              result.errors.push(`Dedup watchlist: ${err.message}`);
            }
          }
        }
      }
    }

    // Save merged data locally
    await localStorage.setWatchlist(merged);
    await localStorage.clearPendingChangesForCollection('watchlist');
    await localStorage.setSyncMeta({ watchlist: Date.now() });

    result.pulled = merged.length - localItems.length + toDeleteFromCloud.length;
    if (result.pulled < 0) result.pulled = 0;
    result.success = true;
  } catch (err: any) {
    result.errors.push(`Watchlist sync failed: ${err.message}`);
  }

  return result;
}

async function syncWatchHistory(userId: string, pendingChanges: PendingChange[]): Promise<SyncResult> {
  const result: SyncResult = { collection: 'watchHistory', success: false, pulled: 0, pushed: 0, deleted: 0, errors: [] };

  try {
    const localItems: WatchHistoryItem[] = await localStorage.getWatchHistory();
    const cloudDocs = await fetchAllDocuments(COLLECTION_IDS.watchHistory, userId);
    const cloudItems = cloudDocs.map(cloudDocToWatchHistory);

    const pendingDeletes = new Set(
      pendingChanges
        .filter(c => c.collection === 'watchHistory' && c.action === 'delete')
        .map(c => c.itemKey)
    );

    const { merged, toPush, toDeleteFromCloud } = mergeItems(
      localItems, cloudItems, watchHistoryKey, watchHistoryTimestamp, pendingDeletes,
    );

    // Push new/updated items to cloud
    for (const item of toPush) {
      try {
        const existing = cloudItems.find(c => watchHistoryKey(c) === watchHistoryKey(item));
        if (existing?.documentId) {
          await databases.updateDocument(DB_ID, COLLECTION_IDS.watchHistory, existing.documentId, watchHistoryToPayload(item, userId));
        } else {
          const response = await databases.createDocument(
            DB_ID, COLLECTION_IDS.watchHistory, ID.unique(),
            watchHistoryToPayload(item, userId),
            userPermissions(userId),
          );
          const mergedItem = merged.find(m => watchHistoryKey(m) === watchHistoryKey(item));
          if (mergedItem) (mergedItem as any).documentId = response.$id;
        }
        result.pushed++;
        await delay(WRITE_DELAY_MS);
      } catch (err: any) {
        result.errors.push(`Push watchHistory ${item.id}_${item.episodeNumber}: ${err.message}`);
      }
    }

    // Delete from cloud
    for (const item of toDeleteFromCloud) {
      try {
        if ((item as any).documentId) {
          await databases.deleteDocument(DB_ID, COLLECTION_IDS.watchHistory, (item as any).documentId);
          result.deleted++;
          await delay(WRITE_DELAY_MS);
        }
      } catch (err: any) {
        if (!err.message?.includes('could not be found')) {
          result.errors.push(`Delete watchHistory: ${err.message}`);
        }
      }
    }

    // Dedup cloud documents
    const docIds = new Map<string, { id: string; watchedAt: number }[]>();
    for (const doc of cloudDocs) {
      const key = `${doc.animeId}_${doc.episodeNumber}_${doc.audioType}`;
      if (!docIds.has(key)) docIds.set(key, []);
      docIds.get(key)!.push({ id: doc.$id, watchedAt: doc.watchedAt ?? 0 });
    }
    for (const [_key, entries] of docIds) {
      if (entries.length > 1) {
        entries.sort((a, b) => b.watchedAt - a.watchedAt);
        for (let i = 1; i < entries.length; i++) {
          try {
            await databases.deleteDocument(DB_ID, COLLECTION_IDS.watchHistory, entries[i].id);
            result.deleted++;
            await delay(WRITE_DELAY_MS);
          } catch (err: any) {
            if (!err.message?.includes('could not be found')) {
              result.errors.push(`Dedup watchHistory: ${err.message}`);
            }
          }
        }
      }
    }

    // Sort merged by most recent
    merged.sort((a, b) => b.watchedAt - a.watchedAt);

    await localStorage.setWatchHistory(merged);
    await localStorage.clearPendingChangesForCollection('watchHistory');
    await localStorage.setSyncMeta({ watchHistory: Date.now() });

    result.pulled = Math.max(0, merged.length - localItems.length + toDeleteFromCloud.length);
    result.success = true;
  } catch (err: any) {
    result.errors.push(`WatchHistory sync failed: ${err.message}`);
  }

  return result;
}

async function syncReadlist(userId: string, pendingChanges: PendingChange[]): Promise<SyncResult> {
  const result: SyncResult = { collection: 'readlist', success: false, pulled: 0, pushed: 0, deleted: 0, errors: [] };

  try {
    const localItems: ReadlistItem[] = await localStorage.getReadlist();
    const cloudDocs = await fetchAllDocuments(COLLECTION_IDS.readlist, userId);
    const cloudItems = cloudDocs.map(cloudDocToReadlist);

    const pendingDeletes = new Set(
      pendingChanges
        .filter(c => c.collection === 'readlist' && c.action === 'delete')
        .map(c => c.itemKey)
    );

    const { merged, toPush, toDeleteFromCloud } = mergeItems(
      localItems, cloudItems, readlistKey, readlistTimestamp, pendingDeletes,
    );

    for (const item of toPush) {
      try {
        const existing = cloudItems.find(c => readlistKey(c) === readlistKey(item));
        if (existing?.documentId) {
          await databases.updateDocument(DB_ID, COLLECTION_IDS.readlist, existing.documentId, readlistToPayload(item, userId));
        } else {
          const response = await databases.createDocument(
            DB_ID, COLLECTION_IDS.readlist, ID.unique(),
            readlistToPayload(item, userId),
            userPermissions(userId),
          );
          const mergedItem = merged.find(m => readlistKey(m) === readlistKey(item));
          if (mergedItem) (mergedItem as any).documentId = response.$id;
        }
        result.pushed++;
        await delay(WRITE_DELAY_MS);
      } catch (err: any) {
        result.errors.push(`Push readlist ${item.id}: ${err.message}`);
      }
    }

    for (const item of toDeleteFromCloud) {
      try {
        if ((item as any).documentId) {
          await databases.deleteDocument(DB_ID, COLLECTION_IDS.readlist, (item as any).documentId);
          result.deleted++;
          await delay(WRITE_DELAY_MS);
        }
      } catch (err: any) {
        if (!err.message?.includes('could not be found')) {
          result.errors.push(`Delete readlist: ${err.message}`);
        }
      }
    }

    // Dedup
    const docIds = new Map<string, string[]>();
    for (const doc of cloudDocs) {
      const key = doc.mangaId;
      if (!docIds.has(key)) docIds.set(key, []);
      docIds.get(key)!.push(doc.$id);
    }
    for (const [_key, ids] of docIds) {
      if (ids.length > 1) {
        for (let i = 1; i < ids.length; i++) {
          try {
            await databases.deleteDocument(DB_ID, COLLECTION_IDS.readlist, ids[i]);
            result.deleted++;
            await delay(WRITE_DELAY_MS);
          } catch (err: any) {
            if (!err.message?.includes('could not be found')) {
              result.errors.push(`Dedup readlist: ${err.message}`);
            }
          }
        }
      }
    }

    merged.sort((a, b) => b.dateAdded - a.dateAdded);
    await localStorage.setReadlist(merged);
    await localStorage.clearPendingChangesForCollection('readlist');
    await localStorage.setSyncMeta({ readlist: Date.now() });

    result.pulled = Math.max(0, merged.length - localItems.length + toDeleteFromCloud.length);
    result.success = true;
  } catch (err: any) {
    result.errors.push(`Readlist sync failed: ${err.message}`);
  }

  return result;
}

async function syncReadHistory(userId: string, pendingChanges: PendingChange[]): Promise<SyncResult> {
  const result: SyncResult = { collection: 'readHistory', success: false, pulled: 0, pushed: 0, deleted: 0, errors: [] };

  try {
    const localItems: ReadHistoryItem[] = await localStorage.getReadHistory();
    const cloudDocs = await fetchAllDocuments(COLLECTION_IDS.readHistory, userId);
    const cloudItems = cloudDocs.map(cloudDocToReadHistory);

    const pendingDeletes = new Set(
      pendingChanges
        .filter(c => c.collection === 'readHistory' && c.action === 'delete')
        .map(c => c.itemKey)
    );

    const { merged, toPush, toDeleteFromCloud } = mergeItems(
      localItems, cloudItems, readHistoryKey, readHistoryTimestamp, pendingDeletes,
    );

    for (const item of toPush) {
      try {
        const existing = cloudItems.find(c => readHistoryKey(c) === readHistoryKey(item));
        if (existing?.documentId) {
          await databases.updateDocument(DB_ID, COLLECTION_IDS.readHistory, existing.documentId, readHistoryToPayload(item, userId));
        } else {
          const response = await databases.createDocument(
            DB_ID, COLLECTION_IDS.readHistory, ID.unique(),
            readHistoryToPayload(item, userId),
            userPermissions(userId),
          );
          const mergedItem = merged.find(m => readHistoryKey(m) === readHistoryKey(item));
          if (mergedItem) (mergedItem as any).documentId = response.$id;
        }
        result.pushed++;
        await delay(WRITE_DELAY_MS);
      } catch (err: any) {
        result.errors.push(`Push readHistory ${item.id}_${item.chapter}: ${err.message}`);
      }
    }

    for (const item of toDeleteFromCloud) {
      try {
        if ((item as any).documentId) {
          await databases.deleteDocument(DB_ID, COLLECTION_IDS.readHistory, (item as any).documentId);
          result.deleted++;
          await delay(WRITE_DELAY_MS);
        }
      } catch (err: any) {
        if (!err.message?.includes('could not be found')) {
          result.errors.push(`Delete readHistory: ${err.message}`);
        }
      }
    }

    // Dedup
    const docIds = new Map<string, { id: string; readAt: number }[]>();
    for (const doc of cloudDocs) {
      const chapterNumber = doc.chapterNumber ?? doc.chapter ?? 0;
      const key = `${doc.mangaId}_${chapterNumber}`;
      if (!docIds.has(key)) docIds.set(key, []);
      const readAt = typeof doc.readAt === 'string' ? new Date(doc.readAt).getTime() : (doc.readAt ?? 0);
      docIds.get(key)!.push({ id: doc.$id, readAt });
    }
    for (const [_key, entries] of docIds) {
      if (entries.length > 1) {
        entries.sort((a, b) => b.readAt - a.readAt);
        for (let i = 1; i < entries.length; i++) {
          try {
            await databases.deleteDocument(DB_ID, COLLECTION_IDS.readHistory, entries[i].id);
            result.deleted++;
            await delay(WRITE_DELAY_MS);
          } catch (err: any) {
            if (!err.message?.includes('could not be found')) {
              result.errors.push(`Dedup readHistory: ${err.message}`);
            }
          }
        }
      }
    }

    merged.sort((a, b) => b.readAt - a.readAt);
    await localStorage.setReadHistory(merged);
    await localStorage.clearPendingChangesForCollection('readHistory');
    await localStorage.setSyncMeta({ readHistory: Date.now() });

    result.pulled = Math.max(0, merged.length - localItems.length + toDeleteFromCloud.length);
    result.success = true;
  } catch (err: any) {
    result.errors.push(`ReadHistory sync failed: ${err.message}`);
  }

  return result;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Check if a full automatic sync should run (i.e. 24 hours have passed).
 */
async function shouldAutoSync(): Promise<boolean> {
  const lastSync = await localStorage.getLastSyncTime();
  return Date.now() - lastSync >= AUTO_SYNC_INTERVAL;
}

/**
 * Get the current authenticated user ID, or null.
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await account.getSession('current');
    return session.userId;
  } catch {
    return null;
  }
}

/**
 * Full bidirectional sync of ALL collections.
 * Called once per day automatically, or manually via sync buttons.
 */
async function performFullSync(): Promise<FullSyncResult> {
  const syncTime = Date.now();
  const results: SyncResult[] = [];

  const userId = await getCurrentUserId();
  if (!userId) {
    console.log('[SyncEngine] No authenticated user, skipping sync');
    return { results: [], syncTime };
  }

  console.log('[SyncEngine] Starting full sync for user:', userId);
  await localStorage.setStoredUserId(userId);

  const pendingChanges = await localStorage.getPendingChanges();
  console.log(`[SyncEngine] ${pendingChanges.length} pending changes to process`);

  // Sync all collections (sequentially to avoid overwhelming Appwrite)
  results.push(await syncWatchlist(userId, pendingChanges));
  results.push(await syncWatchHistory(userId, pendingChanges));
  results.push(await syncReadlist(userId, pendingChanges));
  results.push(await syncReadHistory(userId, pendingChanges));

  await localStorage.setLastSyncTime(syncTime);

  // Log results
  for (const r of results) {
    if (r.success) {
      console.log(`[SyncEngine] ${r.collection}: pushed=${r.pushed}, pulled=${r.pulled}, deleted=${r.deleted}`);
    } else {
      console.error(`[SyncEngine] ${r.collection} FAILED:`, r.errors);
    }
  }

  return { results, syncTime };
}

/**
 * Sync a single collection by name.
 * Used by the manual sync buttons in individual screens.
 */
async function syncCollection(collection: CollectionName): Promise<SyncResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { collection, success: false, pulled: 0, pushed: 0, deleted: 0, errors: ['Not authenticated'] };
  }

  console.log(`[SyncEngine] Syncing ${collection} for user:`, userId);
  await localStorage.setStoredUserId(userId);

  const pendingChanges = await localStorage.getPendingChanges();

  let result: SyncResult;
  switch (collection) {
    case 'watchlist':
      result = await syncWatchlist(userId, pendingChanges);
      break;
    case 'watchHistory':
      result = await syncWatchHistory(userId, pendingChanges);
      break;
    case 'readlist':
      result = await syncReadlist(userId, pendingChanges);
      break;
    case 'readHistory':
      result = await syncReadHistory(userId, pendingChanges);
      break;
  }

  if (result.success) {
    console.log(`[SyncEngine] ${collection} sync: pushed=${result.pushed}, pulled=${result.pulled}, deleted=${result.deleted}`);
  } else {
    console.error(`[SyncEngine] ${collection} sync FAILED:`, result.errors);
  }

  return result;
}

/**
 * Initial bootstrap: if local storage is empty for a user, pull everything
 * from Appwrite once. This runs on first login or when the user switches
 * to a new device.
 */
async function bootstrapFromCloud(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  console.log('[SyncEngine] Checking if bootstrap from cloud is needed...');
  await localStorage.setStoredUserId(userId);

  const localWatchlist = await localStorage.getWatchlist();
  const localWatchHistory = await localStorage.getWatchHistory();
  const localReadlist = await localStorage.getReadlist();
  const localReadHistory = await localStorage.getReadHistory();

  const hasLocalData = localWatchlist.length > 0 || localWatchHistory.length > 0 ||
    localReadlist.length > 0 || localReadHistory.length > 0;

  if (hasLocalData) {
    console.log('[SyncEngine] Local data exists, skipping bootstrap');
    return;
  }

  console.log('[SyncEngine] No local data found, bootstrapping from cloud...');

  try {
    // Pull watchlist
    const watchlistDocs = await fetchAllDocuments(COLLECTION_IDS.watchlist, userId);
    const watchlistItems = watchlistDocs.map(cloudDocToWatchlist);
    await localStorage.setWatchlist(watchlistItems);
    console.log(`[SyncEngine] Bootstrapped ${watchlistItems.length} watchlist items`);

    // Pull watch history
    const watchHistoryDocs = await fetchAllDocuments(COLLECTION_IDS.watchHistory, userId);
    const watchHistoryItems = watchHistoryDocs.map(cloudDocToWatchHistory)
      .sort((a, b) => b.watchedAt - a.watchedAt);
    await localStorage.setWatchHistory(watchHistoryItems);
    console.log(`[SyncEngine] Bootstrapped ${watchHistoryItems.length} watch history items`);

    // Pull readlist
    const readlistDocs = await fetchAllDocuments(COLLECTION_IDS.readlist, userId);
    const readlistItems = readlistDocs.map(cloudDocToReadlist)
      .sort((a, b) => b.dateAdded - a.dateAdded);
    await localStorage.setReadlist(readlistItems);
    console.log(`[SyncEngine] Bootstrapped ${readlistItems.length} readlist items`);

    // Pull read history
    const readHistoryDocs = await fetchAllDocuments(COLLECTION_IDS.readHistory, userId);
    const readHistoryItems = readHistoryDocs.map(cloudDocToReadHistory)
      .sort((a, b) => b.readAt - a.readAt);
    await localStorage.setReadHistory(readHistoryItems);
    console.log(`[SyncEngine] Bootstrapped ${readHistoryItems.length} read history items`);

    await localStorage.setLastSyncTime(Date.now());
    console.log('[SyncEngine] Bootstrap complete');
  } catch (err: any) {
    console.error('[SyncEngine] Bootstrap failed:', err.message);
  }
}

/**
 * Clear all local user data. Called on logout.
 */
async function clearOnLogout(): Promise<void> {
  console.log('[SyncEngine] Clearing local data on logout');
  await localStorage.clearAllUserData();
}

// ── Export ──────────────────────────────────────────────────────────────

const syncEngine = {
  shouldAutoSync,
  performFullSync,
  syncCollection,
  bootstrapFromCloud,
  clearOnLogout,
  getCurrentUserId,
};

export default syncEngine;
export type { SyncResult, FullSyncResult, CollectionName };
