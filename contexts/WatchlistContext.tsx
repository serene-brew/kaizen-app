/**
 * WatchlistContext – LOCAL-FIRST
 *
 * All reads/writes go to AsyncStorage via localStorage.ts.
 * NO direct Appwrite calls.  Cloud sync is handled by SyncEngine.
 *
 * The public API is identical to the old version so that no screen
 * components need to change.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { account } from '../lib/appwrite';
import localStorage from '../lib/localStorage';
import syncEngine from '../lib/syncEngine';
import { showErrorAlert, showSuccessAlert } from '../components/CustomAlert';

// ── Types ──────────────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string;              // Anime ID
  englishName: string;     // Anime name
  thumbnailUrl: string;    // Thumbnail URL
  dateAdded: number;       // Timestamp when added
  documentId?: string;     // Appwrite document ID (populated after sync)
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  isInWatchlist: (id: string) => boolean;
  toggleWatchlist: (id: string, name: string | undefined, thumbnailUrl: string | undefined) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;
  sortWatchlist: (by: 'recent' | 'name') => void;
  isLoading: boolean;
  isSyncing: boolean;
  refreshWatchlist: () => Promise<void>;
  /** Re-read local storage into state without triggering cloud sync */
  reloadFromLocal: () => Promise<void>;
  isAuthenticated: boolean;
}

// ── Context ────────────────────────────────────────────────────────────

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // ── Auth check (only thing that still touches account SDK) ──────────
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

  // ── Load from local storage on mount / auth change ──────────────────
  useEffect(() => {
    const loadLocal = async () => {
      if (!userId) {
        setWatchlist([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const items = await localStorage.getWatchlist();
        setWatchlist(items);
        console.log(`[Watchlist] Loaded ${items.length} items from local storage`);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocal();
  }, [userId]);

  // ── Persist to local storage on every change ────────────────────────
  const persistLocally = useCallback(async (items: WatchlistItem[]) => {
    await localStorage.setWatchlist(items);
  }, []);

  // ── Public API ──────────────────────────────────────────────────────

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some(item => item.id === id),
    [watchlist],
  );

  const removeFromWatchlist = useCallback(async (id: string) => {
    const updated = watchlist.filter(item => item.id !== id);
    setWatchlist(updated);
    await persistLocally(updated);

    // Track the deletion for next sync
    await localStorage.addPendingChange({
      collection: 'watchlist',
      action: 'delete',
      itemKey: id,
    });

    console.log(`[Watchlist] Removed ${id} locally`);
  }, [watchlist, persistLocally]);

  const toggleWatchlist = useCallback(async (
    id: string,
    name: string | undefined,
    thumbnailUrl: string | undefined,
  ) => {
    if (watchlist.some(item => item.id === id)) {
      await removeFromWatchlist(id);
      return;
    }

    if (!userId) {
      showErrorAlert('Authentication Required', 'Please log in to add items to your watchlist.');
      return;
    }

    const newItem: WatchlistItem = {
      id,
      englishName: name || 'Unknown Anime',
      thumbnailUrl: thumbnailUrl || '',
      dateAdded: Date.now(),
    };

    const updated = [...watchlist, newItem];
    setWatchlist(updated);
    await persistLocally(updated);

    // Track the change for next sync
    await localStorage.addPendingChange({
      collection: 'watchlist',
      action: 'upsert',
      itemKey: id,
      payload: newItem,
    });

    console.log(`[Watchlist] Added ${id} locally`);
  }, [watchlist, userId, persistLocally, removeFromWatchlist]);

  const sortWatchlist = useCallback((by: 'recent' | 'name') => {
    setWatchlist(prev => {
      const sorted = [...prev];
      if (by === 'recent') {
        sorted.sort((a, b) => b.dateAdded - a.dateAdded);
      } else {
        sorted.sort((a, b) => a.englishName.localeCompare(b.englishName));
      }
      return sorted;
    });
  }, []);

  /**
   * reloadFromLocal – Re-reads local storage into React state.
   * Does NOT trigger any cloud sync.  Used by SyncManager after
   * it has already pushed/pulled data via SyncEngine.
   */
  const reloadFromLocal = useCallback(async () => {
    try {
      const items = await localStorage.getWatchlist();
      setWatchlist(items);
      console.log(`[Watchlist] Reloaded ${items.length} items from local storage`);
    } catch (err) {
      console.error('[Watchlist] Failed to reload from local storage:', err);
    }
  }, []);

  /**
   * refreshWatchlist – Triggers a cloud sync for this collection,
   * then reloads local storage into state.  Called by manual sync button.
   */
  const refreshWatchlist = useCallback(async () => {
    if (!userId) {
      setWatchlist([]);
      setIsAuthenticated(false);
      return;
    }

    try {
      setIsSyncing(true);
      console.log('[Watchlist] Syncing with cloud...');
      await syncEngine.syncCollection('watchlist');

      // Reload from local storage after sync
      const items = await localStorage.getWatchlist();
      setWatchlist(items);
      console.log(`[Watchlist] Sync complete, ${items.length} items`);
    } catch (err) {
      console.error('[Watchlist] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        isInWatchlist,
        toggleWatchlist,
        removeFromWatchlist,
        sortWatchlist,
        isLoading,
        isSyncing,
        refreshWatchlist,
        reloadFromLocal,
        isAuthenticated,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
