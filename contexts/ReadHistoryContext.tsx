/**
 * ReadHistoryContext – LOCAL-FIRST
 *
 * All reads/writes go to AsyncStorage via localStorage.ts.
 * NO direct Appwrite calls.  Cloud sync is handled by SyncEngine.
 *
 * The public API is identical to the old version so that no screen
 * components need to change.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { account } from '../lib/appwrite';
import localStorage from '../lib/localStorage';
import syncEngine from '../lib/syncEngine';
import { showErrorAlert } from '../components/CustomAlert';

// ── Types ──────────────────────────────────────────────────────────────

export interface ReadHistoryItem {
  id: string;              // manga id
  chapter: string;         // chapter identifier
  title: string;           // manga title
  thumbnailUrl?: string;
  page?: number;           // current page number (1-based)
  totalPages?: number;     // total pages in chapter
  readAt: number;          // timestamp
  documentId?: string;     // Appwrite document id (populated after sync)
}

interface ReadHistoryContextValue {
  history: ReadHistoryItem[];
  isLoading: boolean;
  isSyncing: boolean;
  isAuthenticated: boolean;
  addToHistory: (item: Omit<ReadHistoryItem, 'readAt' | 'documentId'> & { readAt?: number }) => Promise<void>;
  removeFromHistory: (mangaId: string, chapter: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getChaptersForManga: (mangaId: string) => ReadHistoryItem[];
  getLastReadChapter: (mangaId: string) => ReadHistoryItem | null;
  refreshHistory: () => Promise<void>;
  /** Re-read local storage into state without triggering cloud sync */
  reloadFromLocal: () => Promise<void>;
  cleanupDuplicateDocuments: (mangaId: string, chapter: string) => Promise<void>;
  cleanupAllUserDuplicates: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────

const ReadHistoryContext = createContext<ReadHistoryContextValue | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────

const sortHistory = (items: ReadHistoryItem[]) => [...items].sort((a, b) => b.readAt - a.readAt);

// ── Provider ───────────────────────────────────────────────────────────

export const ReadHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ReadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const historyRef = useRef<ReadHistoryItem[]>([]);

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
        const items = await localStorage.getReadHistory();
        setHistory(sortHistory(items));
        console.log(`[ReadHistory] Loaded ${items.length} items from local storage`);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocal();
  }, [userId]);

  // ── Persist helper ──────────────────────────────────────────────────
  const persistLocally = useCallback(async (items: ReadHistoryItem[]) => {
    await localStorage.setReadHistory(items);
  }, []);

  // ── Public API ──────────────────────────────────────────────────────

  const addToHistory = useCallback(async (
    item: Omit<ReadHistoryItem, 'readAt' | 'documentId'> & { readAt?: number },
  ) => {
    if (!userId) {
      showErrorAlert('Authentication Required', 'Please log in to track your reading progress.');
      return;
    }

    const readAt = item.readAt ?? Date.now();
    const rawTotalPages = Number.isFinite(item.totalPages) ? Math.max(0, Math.round(item.totalPages as number)) : 0;
    const rawPage = Number.isFinite(item.page) ? Math.round(item.page as number) : 0;
    const totalPages = rawTotalPages;
    const page = totalPages > 0
      ? Math.min(Math.max(rawPage || 1, 1), totalPages)
      : Math.max(rawPage, 0);

    const existing = historyRef.current.find(entry => entry.id === item.id && entry.chapter === item.chapter);

    const updatedEntry: ReadHistoryItem = existing
      ? { ...existing, ...item, readAt, page, totalPages }
      : { ...item, readAt, page, totalPages };

    // Update local state
    setHistory(prev => {
      const idx = prev.findIndex(entry => entry.id === item.id && entry.chapter === item.chapter);
      let updated: ReadHistoryItem[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = updatedEntry;
      } else {
        updated = [...prev, updatedEntry];
      }
      const sorted = sortHistory(updated);
      // Persist asynchronously
      persistLocally(sorted);
      return sorted;
    });

    // Track for next sync
    const key = `${item.id}_${item.chapter}`;
    await localStorage.addPendingChange({
      collection: 'readHistory',
      action: 'upsert',
      itemKey: key,
      payload: updatedEntry,
    });
  }, [userId, persistLocally]);

  const removeFromHistory = useCallback(async (mangaId: string, chapter: string) => {
    if (!userId) {
      showErrorAlert('Authentication Required', 'Please log in to manage your reading history.');
      return;
    }

    const existing = historyRef.current.find(item => item.id === mangaId && item.chapter === chapter);
    if (!existing) return;

    const updated = historyRef.current.filter(item => !(item.id === mangaId && item.chapter === chapter));
    setHistory(updated);
    await persistLocally(updated);

    const key = `${mangaId}_${chapter}`;
    await localStorage.addPendingChange({
      collection: 'readHistory',
      action: 'delete',
      itemKey: key,
    });
  }, [userId, persistLocally]);

  const clearHistory = useCallback(async () => {
    // Track all items as pending deletes
    for (const item of historyRef.current) {
      const key = `${item.id}_${item.chapter}`;
      await localStorage.addPendingChange({
        collection: 'readHistory',
        action: 'delete',
        itemKey: key,
      });
    }
    setHistory([]);
    await persistLocally([]);
  }, [persistLocally]);

  const getChaptersForManga = useCallback(
    (mangaId: string) => historyRef.current.filter(item => item.id === mangaId),
    [],
  );

  const getLastReadChapter = useCallback((mangaId: string) => {
    const chapters = historyRef.current.filter(item => item.id === mangaId);
    if (chapters.length === 0) return null;
    return sortHistory(chapters)[0];
  }, []);

  /**
   * reloadFromLocal – Re-reads local storage into React state.
   * Does NOT trigger any cloud sync.  Used by SyncManager after
   * it has already pushed/pulled data via SyncEngine.
   */
  const reloadFromLocal = useCallback(async () => {
    try {
      const items = await localStorage.getReadHistory();
      setHistory(sortHistory(items));
      console.log(`[ReadHistory] Reloaded ${items.length} items from local storage`);
    } catch (err) {
      console.error('[ReadHistory] Failed to reload from local storage:', err);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    // Re-check auth
    try {
      const session = await account.getSession('current');
      setUserId(session.userId);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setUserId(null);
      setHistory([]);
      return;
    }

    try {
      setIsSyncing(true);
      console.log('[ReadHistory] Syncing with cloud...');
      await syncEngine.syncCollection('readHistory');

      const items = await localStorage.getReadHistory();
      setHistory(sortHistory(items));
      console.log(`[ReadHistory] Sync complete, ${items.length} items`);
    } catch (err) {
      console.error('[ReadHistory] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Cleanup functions are now no-ops locally.
   * Deduplication happens during sync in SyncEngine.
   */
  const cleanupDuplicateDocuments = useCallback(async (_mangaId: string, _chapter: string) => {
    // No-op: handled by SyncEngine
  }, []);

  const cleanupAllUserDuplicates = useCallback(async () => {
    // No-op: handled by SyncEngine
    console.log('[ReadHistory] Local dedup not needed — handled by SyncEngine during sync');
  }, []);

  const value = useMemo<ReadHistoryContextValue>(
    () => ({
      history,
      isLoading,
      isSyncing,
      isAuthenticated,
      addToHistory,
      removeFromHistory,
      clearHistory,
      getChaptersForManga,
      getLastReadChapter,
      refreshHistory,
      reloadFromLocal,
      cleanupDuplicateDocuments,
      cleanupAllUserDuplicates,
    }),
    [history, isLoading, isSyncing, isAuthenticated, addToHistory, removeFromHistory, clearHistory, getChaptersForManga, getLastReadChapter, refreshHistory, reloadFromLocal, cleanupDuplicateDocuments, cleanupAllUserDuplicates],
  );

  return (
    <ReadHistoryContext.Provider value={value}>
      {children}
    </ReadHistoryContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────

export const useReadHistory = () => {
  const ctx = useContext(ReadHistoryContext);
  if (!ctx) throw new Error('useReadHistory must be used within a ReadHistoryProvider');
  return ctx;
};
