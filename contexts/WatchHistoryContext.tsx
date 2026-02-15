/**
 * WatchHistoryContext – LOCAL-FIRST
 *
 * All reads/writes go to AsyncStorage via localStorage.ts.
 * NO direct Appwrite calls.  Cloud sync is handled by SyncEngine.
 *
 * The public API is identical to the old version so that no screen
 * components need to change.
 */

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { account } from '../lib/appwrite';
import localStorage from '../lib/localStorage';
import syncEngine from '../lib/syncEngine';
import { showErrorAlert, showSuccessAlert } from '../components/CustomAlert';

// ── Types ──────────────────────────────────────────────────────────────

export interface WatchHistoryItem {
  id: string;                  // anime id
  episodeNumber: string;       // episode number
  audioType: 'sub' | 'dub';   // sub or dub
  englishName: string;         // anime name
  thumbnailUrl: string;        // thumbnail URL
  watchedAt: number;           // timestamp when watched
  position: number;            // playback position in milliseconds
  duration: number;            // total duration in milliseconds
  documentId?: string;         // Appwrite document ID (populated after sync)
}

interface WatchHistoryContextType {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'documentId' | 'watchedAt'>) => Promise<void>;
  removeFromHistory: (animeId: string, episodeNumber: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getWatchedEpisodes: (animeId: string) => WatchHistoryItem[];
  isEpisodeWatched: (animeId: string, episodeNumber: string) => boolean;
  getLastWatchedEpisode: (animeId: string) => WatchHistoryItem | null;
  isLoading: boolean;
  isSyncing: boolean;
  refreshWatchHistory: () => Promise<WatchHistoryItem[] | undefined>;
  /** Re-read local storage into state without triggering cloud sync */
  reloadFromLocal: () => Promise<void>;
  syncHistory: () => Promise<void>;
  cleanupDuplicateDocuments: (animeId: string, episodeNumber: string, audioType: 'sub' | 'dub') => Promise<void>;
  cleanupAllUserDuplicates: () => Promise<void>;
  isAuthenticated: boolean;
}

// ── Context ────────────────────────────────────────────────────────────

const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────

export const WatchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const historyRef = useRef<WatchHistoryItem[]>([]);

  // Keep ref in sync
  useEffect(() => { historyRef.current = history; }, [history]);

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
        setHistory([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const items = await localStorage.getWatchHistory();
        items.sort((a: WatchHistoryItem, b: WatchHistoryItem) => b.watchedAt - a.watchedAt);
        setHistory(items);
        console.log(`[WatchHistory] Loaded ${items.length} items from local storage`);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocal();
  }, [userId]);

  // ── Persist helper ──────────────────────────────────────────────────
  const persistLocally = useCallback(async (items: WatchHistoryItem[]) => {
    await localStorage.setWatchHistory(items);
  }, []);

  // ── Public API ──────────────────────────────────────────────────────

  const addToHistory = useCallback(async (item: Omit<WatchHistoryItem, 'documentId' | 'watchedAt'>) => {
    if (!userId) {
      console.log('Cannot add to watch history: User not authenticated');
      return;
    }

    const watchedAt = Date.now();
    const currentHistory = historyRef.current;

    const existingIndex = currentHistory.findIndex(
      h => h.id === item.id && h.episodeNumber === item.episodeNumber,
    );

    let updatedHistory: WatchHistoryItem[];

    if (existingIndex !== -1) {
      // Update existing item
      const updated = {
        ...currentHistory[existingIndex],
        position: item.position,
        duration: item.duration,
        watchedAt,
        audioType: item.audioType,
      };
      updatedHistory = [...currentHistory];
      updatedHistory[existingIndex] = updated;
    } else {
      // New item
      const newItem: WatchHistoryItem = { ...item, watchedAt };
      updatedHistory = [newItem, ...currentHistory];
    }

    // Sort by most recent
    updatedHistory.sort((a, b) => b.watchedAt - a.watchedAt);
    setHistory(updatedHistory);
    await persistLocally(updatedHistory);

    // Track for next sync
    const key = `${item.id}_${item.episodeNumber}_${item.audioType}`;
    await localStorage.addPendingChange({
      collection: 'watchHistory',
      action: 'upsert',
      itemKey: key,
      payload: updatedHistory.find(h => h.id === item.id && h.episodeNumber === item.episodeNumber),
    });
  }, [userId, persistLocally]);

  const removeFromHistory = useCallback(async (animeId: string, episodeNumber: string) => {
    if (!userId) return;

    const item = historyRef.current.find(
      h => h.id === animeId && h.episodeNumber === episodeNumber,
    );
    if (!item) return;

    const updated = historyRef.current.filter(
      h => !(h.id === animeId && h.episodeNumber === episodeNumber),
    );
    setHistory(updated);
    await persistLocally(updated);

    const key = `${animeId}_${episodeNumber}_${item.audioType}`;
    await localStorage.addPendingChange({
      collection: 'watchHistory',
      action: 'delete',
      itemKey: key,
    });
  }, [userId, persistLocally]);

  const clearHistory = useCallback(async () => {
    if (!userId) {
      showErrorAlert('Error', 'You must be logged in to clear your watch history');
      return;
    }

    // Track all items as pending deletes
    for (const item of historyRef.current) {
      const key = `${item.id}_${item.episodeNumber}_${item.audioType}`;
      await localStorage.addPendingChange({
        collection: 'watchHistory',
        action: 'delete',
        itemKey: key,
      });
    }

    setHistory([]);
    await persistLocally([]);
    showSuccessAlert('Success', 'Watch history cleared successfully');
  }, [userId, persistLocally]);

  const getWatchedEpisodes = useCallback(
    (animeId: string): WatchHistoryItem[] => historyRef.current.filter(item => item.id === animeId),
    [],
  );

  const isEpisodeWatched = useCallback(
    (animeId: string, episodeNumber: string): boolean =>
      historyRef.current.some(item => item.id === animeId && item.episodeNumber === episodeNumber),
    [],
  );

  const getLastWatchedEpisode = useCallback((animeId: string): WatchHistoryItem | null => {
    const episodes = historyRef.current
      .filter(item => item.id === animeId)
      .sort((a, b) => b.watchedAt - a.watchedAt);
    return episodes.length > 0 ? episodes[0] : null;
  }, []);

  /**
   * reloadFromLocal – Re-reads local storage into React state.
   * Does NOT trigger any cloud sync.  Used by SyncManager after
   * it has already pushed/pulled data via SyncEngine.
   */
  const reloadFromLocal = useCallback(async () => {
    try {
      const items = await localStorage.getWatchHistory();
      items.sort((a: WatchHistoryItem, b: WatchHistoryItem) => b.watchedAt - a.watchedAt);
      setHistory(items);
      console.log(`[WatchHistory] Reloaded ${items.length} items from local storage`);
    } catch (err) {
      console.error('[WatchHistory] Failed to reload from local storage:', err);
    }
  }, []);

  /**
   * refreshWatchHistory – Triggers a cloud sync for watch history,
   * then reloads from local storage.  Called by manual sync button.
   */
  const refreshWatchHistory = useCallback(async (): Promise<WatchHistoryItem[] | undefined> => {
    // Re-check auth
    try {
      const session = await account.getSession('current');
      if (session) {
        if (!userId || userId !== session.userId) {
          setUserId(session.userId);
          setIsAuthenticated(true);
        }
      }
    } catch {
      setIsAuthenticated(false);
      setUserId(null);
      setHistory([]);
      setIsLoading(false);
      setIsSyncing(false);
      return [];
    }

    if (!userId) {
      setHistory([]);
      return [];
    }

    try {
      setIsLoading(true);
      setIsSyncing(true);
      console.log('[WatchHistory] Syncing with cloud...');
      await syncEngine.syncCollection('watchHistory');

      const items = await localStorage.getWatchHistory();
      items.sort((a: WatchHistoryItem, b: WatchHistoryItem) => b.watchedAt - a.watchedAt);
      setHistory(items);
      console.log(`[WatchHistory] Sync complete, ${items.length} items`);
      return items;
    } catch (err) {
      console.error('[WatchHistory] Sync failed:', err);
      return history;
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [userId, history]);

  /**
   * syncHistory – Manual sync triggered by user button.
   */
  const syncHistory = useCallback(async () => {
    if (!userId) {
      showErrorAlert('Not logged in', 'Please log in to sync your watch history.');
      return;
    }

    try {
      setIsSyncing(true);
      await syncEngine.syncCollection('watchHistory');

      const items = await localStorage.getWatchHistory();
      items.sort((a: WatchHistoryItem, b: WatchHistoryItem) => b.watchedAt - a.watchedAt);
      setHistory(items);
      showSuccessAlert('Sync Complete', 'Your watch history has been updated.');
    } catch (err) {
      console.error('[WatchHistory] Sync failed:', err);
      showErrorAlert('Sync Failed', 'There was a problem syncing your watch history.');
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  /**
   * cleanupDuplicateDocuments – Now a no-op locally.
   * Deduplication happens during sync in SyncEngine.
   */
  const cleanupDuplicateDocuments = useCallback(async (
    _animeId: string, _episodeNumber: string, _audioType: 'sub' | 'dub',
  ) => {
    // No-op: dedup is handled by SyncEngine during sync
  }, []);

  const cleanupAllUserDuplicates = useCallback(async () => {
    // No-op: dedup is handled by SyncEngine during sync
    console.log('[WatchHistory] Local dedup not needed — handled by SyncEngine during sync');
  }, []);

  return (
    <WatchHistoryContext.Provider
      value={{
        history,
        addToHistory,
        removeFromHistory,
        clearHistory,
        getWatchedEpisodes,
        isEpisodeWatched,
        getLastWatchedEpisode,
        isLoading,
        isSyncing,
        refreshWatchHistory,
        reloadFromLocal,
        syncHistory,
        cleanupDuplicateDocuments,
        cleanupAllUserDuplicates,
        isAuthenticated,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (context === undefined) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};
