/**
 * ReadlistContext – LOCAL-FIRST
 *
 * All reads/writes go to AsyncStorage via localStorage.ts.
 * NO direct Appwrite calls.  Cloud sync is handled by SyncEngine.
 *
 * The public API is identical to the old version so that no screen
 * components need to change.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { account } from '../lib/appwrite';
import localStorage from '../lib/localStorage';
import syncEngine from '../lib/syncEngine';
import { showErrorAlert } from '../components/CustomAlert';

// ── Types ──────────────────────────────────────────────────────────────

export interface ReadlistItem {
  id: string;             // manga id
  title: string;          // display title
  thumbnailUrl?: string;  // cover image
  dateAdded: number;      // epoch ms
  documentId?: string;    // Appwrite document id (populated after sync)
}

interface ReadlistContextValue {
  readlist: ReadlistItem[];
  isLoading: boolean;
  isSyncing: boolean;
  isAuthenticated: boolean;
  isInReadlist: (id: string) => boolean;
  toggleReadlist: (item: { id: string; title: string; thumbnail?: string }) => Promise<void>;
  removeFromReadlist: (id: string) => Promise<void>;
  clearReadlist: () => Promise<void>;
  refreshReadlist: () => Promise<void>;
  /** Re-read local storage into state without triggering cloud sync */
  reloadFromLocal: () => Promise<void>;
  sortReadlist: (by: 'recent' | 'name') => void;
}

// ── Context ────────────────────────────────────────────────────────────

const ReadlistContext = createContext<ReadlistContextValue | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────

const sortReadlistItems = (items: ReadlistItem[], by: 'recent' | 'name'): ReadlistItem[] => {
  const sorted = [...items];
  if (by === 'recent') {
    sorted.sort((a, b) => b.dateAdded - a.dateAdded);
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted;
};

// ── Provider ───────────────────────────────────────────────────────────

export const ReadlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [readlist, setReadlist] = useState<ReadlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // ── Auth check ──────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await account.getSession('current');
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch {
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ── Load from local storage ─────────────────────────────────────────
  useEffect(() => {
    const loadLocal = async () => {
      if (!userId) {
        setReadlist([]);
        return;
      }
      setIsLoading(true);
      try {
        const items = await localStorage.getReadlist();
        setReadlist(sortReadlistItems(items, 'recent'));
        console.log(`[Readlist] Loaded ${items.length} items from local storage`);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocal();
  }, [userId]);

  // ── Persist helper ──────────────────────────────────────────────────
  const persistLocally = useCallback(async (items: ReadlistItem[]) => {
    await localStorage.setReadlist(items);
  }, []);

  // ── Public API ──────────────────────────────────────────────────────

  const isInReadlist = useCallback(
    (id: string) => readlist.some(item => item.id === id),
    [readlist],
  );

  const removeFromReadlist = useCallback(async (id: string) => {
    const updated = readlist.filter(item => item.id !== id);
    setReadlist(updated);
    await persistLocally(updated);

    await localStorage.addPendingChange({
      collection: 'readlist',
      action: 'delete',
      itemKey: id,
    });
    console.log(`[Readlist] Removed ${id} locally`);
  }, [readlist, persistLocally]);

  const toggleReadlist = useCallback(async (item: { id: string; title: string; thumbnail?: string }) => {
    if (isInReadlist(item.id)) {
      await removeFromReadlist(item.id);
      return;
    }

    if (!userId) {
      showErrorAlert('Authentication Required', 'Please log in to add items to your readlist.');
      return;
    }

    const now = Date.now();
    const newEntry: ReadlistItem = {
      id: item.id,
      title: item.title || 'Unknown Manga',
      thumbnailUrl: item.thumbnail || '',
      dateAdded: now,
    };

    const updated = [...readlist, newEntry];
    setReadlist(updated);
    await persistLocally(updated);

    await localStorage.addPendingChange({
      collection: 'readlist',
      action: 'upsert',
      itemKey: item.id,
      payload: newEntry,
    });
    console.log(`[Readlist] Added ${item.id} locally`);
  }, [readlist, userId, persistLocally, isInReadlist, removeFromReadlist]);

  const clearReadlist = useCallback(async () => {
    // Track all items as pending deletes
    for (const item of readlist) {
      await localStorage.addPendingChange({
        collection: 'readlist',
        action: 'delete',
        itemKey: item.id,
      });
    }
    setReadlist([]);
    await persistLocally([]);
  }, [readlist, persistLocally]);

  /**
   * reloadFromLocal – Re-reads local storage into React state.
   * Does NOT trigger any cloud sync.  Used by SyncManager after
   * it has already pushed/pulled data via SyncEngine.
   */
  const reloadFromLocal = useCallback(async () => {
    try {
      const items = await localStorage.getReadlist();
      setReadlist(sortReadlistItems(items, 'recent'));
      console.log(`[Readlist] Reloaded ${items.length} items from local storage`);
    } catch (err) {
      console.error('[Readlist] Failed to reload from local storage:', err);
    }
  }, []);

  const refreshReadlist = useCallback(async () => {
    if (!userId) {
      // Re-check auth
      try {
        const session = await account.getSession('current');
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        setUserId(null);
        setReadlist([]);
        return;
      }
    }

    try {
      setIsSyncing(true);
      console.log('[Readlist] Syncing with cloud...');
      await syncEngine.syncCollection('readlist');

      const items = await localStorage.getReadlist();
      setReadlist(sortReadlistItems(items, 'recent'));
      console.log(`[Readlist] Sync complete, ${items.length} items`);
    } catch (err) {
      console.error('[Readlist] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  const sortReadlist = useCallback((by: 'recent' | 'name') => {
    setReadlist(prev => sortReadlistItems(prev, by));
  }, []);

  const value = useMemo<ReadlistContextValue>(
    () => ({
      readlist,
      isLoading,
      isSyncing,
      isAuthenticated,
      isInReadlist,
      toggleReadlist,
      removeFromReadlist,
      clearReadlist,
      refreshReadlist,
      reloadFromLocal,
      sortReadlist,
    }),
    [readlist, isLoading, isSyncing, isAuthenticated, isInReadlist, toggleReadlist, removeFromReadlist, clearReadlist, refreshReadlist, reloadFromLocal, sortReadlist],
  );

  return <ReadlistContext.Provider value={value}>{children}</ReadlistContext.Provider>;
};

// ── Hook ───────────────────────────────────────────────────────────────

export const useReadlist = () => {
  const context = useContext(ReadlistContext);
  if (!context) {
    throw new Error('useReadlist must be used within a ReadlistProvider');
  }
  return context;
};
