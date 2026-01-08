import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ID, Permission, Query, Role } from 'appwrite';
import Constants from 'expo-constants';

import { account, databases } from '../lib/appwrite';
import { showErrorAlert } from '../components/CustomAlert';

export interface ReadHistoryItem {
  id: string; // manga id
  chapter: string; // chapter identifier
  title: string; // manga title
  thumbnailUrl?: string;
  page?: number; // current page number (1-based) if known
  totalPages?: number; // total pages in chapter if known
  readAt: number; // timestamp
  documentId?: string; // Appwrite document id
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
  cleanupDuplicateDocuments: (mangaId: string, chapter: string) => Promise<void>;
  cleanupAllUserDuplicates: () => Promise<void>;
}

const APPWRITE_DATABASE_ID = Constants.expoConfig?.extra?.appwriteDatabaseId;
const APPWRITE_READHISTORY_COLLECTION_ID = Constants.expoConfig?.extra?.appwriteReadHistoryCollectionId;

const ReadHistoryContext = createContext<ReadHistoryContextValue | undefined>(undefined);

const sortHistory = (items: ReadHistoryItem[]) => [...items].sort((a, b) => b.readAt - a.readAt);

const parseChapterNumber = (chapter: string) => {
  const parsed = parseFloat(chapter);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTimestamp = (value: unknown) => {
  if (typeof value === 'string') return new Date(value).getTime();
  if (typeof value === 'number') return value;
  return Date.now();
};

export const ReadHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<ReadHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const lastCloudUpdateRef = useRef<Record<string, number>>({});
  const lastSavedPageRef = useRef<Record<string, number>>({});
  const historyRef = useRef<ReadHistoryItem[]>([]);
  const [cleanupInProgress, setCleanupInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const markCloudUpdated = (mangaId: string, chapter: string) => {
    const key = `${mangaId}_${chapter}`;
    lastCloudUpdateRef.current[key] = Date.now();
  };

  const clearCloudUpdate = (mangaId: string, chapter: string) => {
    const key = `${mangaId}_${chapter}`;
    delete lastCloudUpdateRef.current[key];
    delete lastSavedPageRef.current[key];
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await account.getSession('current');
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch (error) {
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchCloudHistory = useCallback(async (targetUserId?: string): Promise<ReadHistoryItem[]> => {
    const activeUserId = targetUserId ?? userId;
    if (!activeUserId || !APPWRITE_DATABASE_ID || !APPWRITE_READHISTORY_COLLECTION_ID) return [];

    try {
      let all: ReadHistoryItem[] = [];
      let lastId: string | null = null;
      const pageLimit = 100;

      while (true) {
        const queries = [Query.equal('userId', activeUserId), Query.limit(pageLimit)];
        if (lastId) queries.push(Query.cursorAfter(lastId));

        console.log(`[ReadHistory] Fetching documents from Appwrite (page limit: ${pageLimit}, cursor: ${lastId || 'start'})`);
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_READHISTORY_COLLECTION_ID,
          queries
        );
        console.log(`[ReadHistory] Received ${response.documents.length} documents from Appwrite`);

        if (response.documents.length === 0) break;

        const batch: ReadHistoryItem[] = response.documents.map((doc) => {
          const anyDoc = doc as unknown as Record<string, any>;
          const readAt = normalizeTimestamp(anyDoc.readAt);
          const totalPages = typeof anyDoc.totalPages === 'number' ? Math.max(0, Math.round(anyDoc.totalPages)) : 0;
          const rawPage = typeof anyDoc.page === 'number' ? Math.round(anyDoc.page) : 0;
          const page = totalPages > 0
            ? Math.min(Math.max(rawPage, 1), totalPages)
            : Math.max(rawPage, 0);
          const chapterNumber = anyDoc.chapterNumber ?? anyDoc.chapter ?? anyDoc.chapterId ?? 0;

          return {
            id: anyDoc.mangaId,
            chapter: String(chapterNumber ?? ''),
            title: anyDoc.title,
            thumbnailUrl: anyDoc.thumbnailUrl,
            page,
            totalPages,
            readAt,
            documentId: doc.$id,
          };
        });

        all = [...all, ...batch];

        if (response.documents.length < pageLimit) break;
        lastId = response.documents[response.documents.length - 1].$id;
      }

      return sortHistory(all);
    } catch (error) {
      console.error('Failed to fetch read history from Appwrite:', error);
      return [];
    }
  }, [userId]);

  // Load cloud history when auth state changes
  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setHistory([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const cloud = await fetchCloudHistory();
        setHistory(cloud);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId]);

  const refreshHistory = useCallback(async () => {
    setIsSyncing(true);
    try {
      let sessionUserId: string | null = null;
      try {
        const session = await account.getSession('current');
        sessionUserId = session.userId;
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        setUserId(null);
        setHistory([]);
        return;
      }

      if (sessionUserId) {
        const cloud = await fetchCloudHistory(sessionUserId);
        setHistory(cloud);
      }
    } catch (error) {
      console.error('Error refreshing read history:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchCloudHistory]);

  const addToHistory = useCallback(async (item: Omit<ReadHistoryItem, 'readAt' | 'documentId'> & { readAt?: number }) => {
    if (!userId) {
      showErrorAlert('Authentication Required', 'Please log in to track your reading progress.');
      return;
    }

    if (!APPWRITE_DATABASE_ID || !APPWRITE_READHISTORY_COLLECTION_ID) {
      console.error('Missing Appwrite configuration for read history.');
      return;
    }

    const readAt = item.readAt ?? Date.now();
    const rawTotalPages = Number.isFinite(item.totalPages) ? Math.max(0, Math.round(item.totalPages as number)) : 0;
    const rawPage = Number.isFinite(item.page) ? Math.round(item.page as number) : 0;
    const totalPages = rawTotalPages;
    const page = totalPages > 0
      ? Math.min(Math.max(rawPage || 1, 1), totalPages)
      : Math.max(rawPage, 0);
    const chapterNumber = parseChapterNumber(item.chapter);

    const existing = historyRef.current.find(entry => entry.id === item.id && entry.chapter === item.chapter);
    const existingDocId = existing?.documentId;

    const updatedEntry: ReadHistoryItem = existing
      ? { ...existing, ...item, readAt, page, totalPages }
      : { ...item, readAt, page, totalPages };

    // Update local state immediately
    setHistory(prev => {
      const idx = prev.findIndex(entry => entry.id === item.id && entry.chapter === item.chapter);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = updatedEntry;
        return sortHistory(updated);
      }

      return sortHistory([...prev, updatedEntry]);
    });

    const key = `${item.id}_${item.chapter}`;
    const lastSavedPage = lastSavedPageRef.current[key];
    const lastUpdate = lastCloudUpdateRef.current[key] || 0;
    const now = Date.now();

    // Check if we should skip cloud update based on page and time
    if (lastSavedPage === page) {
      // Same page, don't update
      return;
    }

    // For pages in the middle, throttle updates to 30 seconds
    const isFirstPage = page === 1;
    const isLastPage = totalPages > 0 && page === totalPages;
    const shouldThrottle = !isFirstPage && !isLastPage;
    
    if (shouldThrottle && (now - lastUpdate < 30000)) {
      // Less than 30 seconds since last update for middle pages, skip
      return;
    }

    const payload = {
      userId,
      mangaId: item.id,
      title: item.title || 'Unknown Manga',
      thumbnailUrl: item.thumbnailUrl || '',
      page,
      totalPages,
      readAt: new Date(readAt).toISOString(),
      chapterNumber,
    };

    try {
      if (existingDocId) {
        // Document exists, update it
        markCloudUpdated(item.id, item.chapter);
        console.log(`[ReadHistory] Updating existing document in Appwrite for ${item.id} chapter ${item.chapter}`);
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_READHISTORY_COLLECTION_ID,
          existingDocId,
          payload
        );
        console.log(`[ReadHistory] Document update successful`);
        lastSavedPageRef.current[key] = page;
        
        // Clean up any duplicates after successful update (don't await to avoid blocking)
        setTimeout(() => cleanupDuplicateDocuments(item.id, item.chapter), 100);
      } else {
        // No document exists locally, check if one exists in cloud before creating
        try {
          console.log(`[ReadHistory] Checking Appwrite for existing document: ${item.id} chapter ${item.chapter}`);
          const cloudCheck = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_READHISTORY_COLLECTION_ID,
            [
              Query.equal('userId', userId),
              Query.equal('mangaId', item.id),
              Query.equal('chapterNumber', chapterNumber),
              Query.limit(1)
            ]
          );
          console.log(`[ReadHistory] Cloud check returned ${cloudCheck.documents.length} documents`);

          if (cloudCheck.documents.length > 0) {
            // Document exists in cloud, update it instead of creating new
            const existingDoc = cloudCheck.documents[0];
            console.log(`[ReadHistory] Found existing document in cloud for ${item.id} chapter ${item.chapter}, updating instead of creating`);
            
            markCloudUpdated(item.id, item.chapter);
            await databases.updateDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_READHISTORY_COLLECTION_ID,
              existingDoc.$id,
              payload
            );
            console.log(`[ReadHistory] Existing cloud document updated successfully`);

            // Update local state with document ID
            setHistory(prev =>
              prev.map(entry =>
                entry.id === item.id && entry.chapter === item.chapter
                  ? { ...entry, documentId: existingDoc.$id }
                  : entry
              )
            );
            lastSavedPageRef.current[key] = page;
            
            // Clean up any other duplicates (don't await to avoid blocking)
            setTimeout(() => cleanupDuplicateDocuments(item.id, item.chapter), 100);
          } else {
            // No document exists, create new one
            markCloudUpdated(item.id, item.chapter);
            console.log(`[ReadHistory] Creating new document in Appwrite for ${item.id} chapter ${item.chapter}`);
            const response = await databases.createDocument(
              APPWRITE_DATABASE_ID,
              APPWRITE_READHISTORY_COLLECTION_ID,
              ID.unique(),
              payload,
              [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
              ]
            );
            console.log(`[ReadHistory] New document created successfully with ID: ${response.$id}`);

            setHistory(prev =>
              prev.map(entry =>
                entry.id === item.id && entry.chapter === item.chapter
                  ? { ...entry, documentId: response.$id }
                  : entry
              )
            );
            lastSavedPageRef.current[key] = page;
          }
        } catch (checkError) {
          console.error('[ReadHistory] Error checking for existing document:', checkError);
          clearCloudUpdate(item.id, item.chapter);
        }
      }
    } catch (error: any) {
      clearCloudUpdate(item.id, item.chapter);
      
      // If update fails because document not found, clear the documentId and try again
      if (error.message?.includes('could not be found')) {
        console.log(`[ReadHistory] Document not found error, clearing documentId for ${item.id} chapter ${item.chapter}`);
        setHistory(prev =>
          prev.map(entry =>
            entry.id === item.id && entry.chapter === item.chapter
              ? { ...entry, documentId: undefined }
              : entry
          )
        );
      } else {
        console.error('[ReadHistory] Failed to sync read history:', error);
      }
    }
  }, [userId]);

  const removeFromHistory = useCallback(async (mangaId: string, chapter: string) => {
    if (!userId) {
      showErrorAlert('Authentication Required', 'Please log in to manage your reading history.');
      return;
    }

    const existing = historyRef.current.find(item => item.id === mangaId && item.chapter === chapter);
    if (!existing) return;

    // Update local state first
    setHistory(prev => prev.filter(item => !(item.id === mangaId && item.chapter === chapter)));

    // Delete from Appwrite if document exists
    if (existing.documentId) {
      try {
        console.log(`[ReadHistory] Deleting document from Appwrite: ${existing.documentId}`);
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID as string,
          APPWRITE_READHISTORY_COLLECTION_ID as string,
          existing.documentId
        );
        console.log(`[ReadHistory] Document deleted successfully`);
      } catch (error) {
        console.error('[ReadHistory] Failed to delete document from Appwrite:', error);
        // Rollback local state on error
        setHistory(prev => sortHistory([...prev, existing]));
        showErrorAlert('Failed to Remove', 'Could not remove the chapter from your history.');
      }
    }
  }, [userId]);

  const clearHistory = useCallback(async () => {
    const snapshot = [...historyRef.current];
    setHistory([]);
    lastCloudUpdateRef.current = {};
    lastSavedPageRef.current = {};

    if (userId) {
      try {
        const deletions = snapshot
          .filter(item => item.documentId)
          .map(item =>
            databases.deleteDocument(
              APPWRITE_DATABASE_ID as string,
              APPWRITE_READHISTORY_COLLECTION_ID as string,
              item.documentId as string
            )
          );

        await Promise.allSettled(deletions);
      } catch (error) {
        console.error('Failed to clear read history:', error);
        setHistory(snapshot);
        showErrorAlert('Failed to Clear', 'Could not clear your read history.');
      }
    }
  }, [userId]);

  const getChaptersForManga = useCallback((mangaId: string) => historyRef.current.filter(item => item.id === mangaId), []);

  const getLastReadChapter = useCallback((mangaId: string) => {
    const chapters = getChaptersForManga(mangaId);
    return chapters.length > 0 ? chapters[0] : null;
  }, [getChaptersForManga]);

  // Cleanup duplicate documents for a specific manga chapter
  const cleanupDuplicateDocuments = useCallback(async (mangaId: string, chapter: string) => {
    if (!userId || !APPWRITE_DATABASE_ID || !APPWRITE_READHISTORY_COLLECTION_ID) return;

    const cleanupKey = `${mangaId}_${chapter}`;
    
    // Check if cleanup already in progress
    if (cleanupInProgress.has(cleanupKey)) {
      console.log(`Cleanup already in progress for ${cleanupKey}, skipping...`);
      return;
    }

    // Mark cleanup as in progress
    setCleanupInProgress(prev => new Set(prev).add(cleanupKey));

    try {
      // Query for all documents matching this manga and chapter
      console.log(`[ReadHistory] Checking for duplicates in Appwrite for ${mangaId} chapter ${chapter}`);
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_READHISTORY_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('mangaId', mangaId),
          Query.equal('chapterNumber', parseChapterNumber(chapter)),
          Query.limit(100)
        ]
      );
      console.log(`[ReadHistory] Found ${response.documents.length} documents for duplicate check`);

      if (response.documents.length <= 1) {
        console.log(`No duplicates found for ${mangaId} chapter ${chapter}`);
        return;
      }

      console.log(`Found ${response.documents.length} documents for ${mangaId} chapter ${chapter}, removing duplicates...`);

      // Sort by readAt timestamp (keep most recent)
      const sortedDocs = response.documents.sort((a: any, b: any) => {
        const aTime = normalizeTimestamp(a.readAt);
        const bTime = normalizeTimestamp(b.readAt);
        return bTime - aTime;
      });

      // Keep the first (most recent), delete the rest
      const docsToDelete = sortedDocs.slice(1);
      let successfulDeletes = 0;

      for (const doc of docsToDelete) {
        try {
          console.log(`[ReadHistory] Deleting duplicate document ${doc.$id}`);
          await databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_READHISTORY_COLLECTION_ID,
            doc.$id
          );
          successfulDeletes++;
          
          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (deleteError: any) {
          if (!deleteError.message?.includes('could not be found')) {
            console.error(`[ReadHistory] Failed to delete duplicate document ${doc.$id}:`, deleteError);
          }
        }
      }

      if (successfulDeletes > 0) {
        console.log(`[ReadHistory] Cleaned up ${successfulDeletes} duplicate documents for ${mangaId} chapter ${chapter}`);
      }
    } catch (error) {
      console.error('[ReadHistory] Error cleaning up duplicate documents:', error);
    } finally {
      // Remove from in-progress set
      setCleanupInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(cleanupKey);
        return newSet;
      });
    }
  }, [userId]);

  // Global cleanup function to remove ALL duplicate documents for a user
  const cleanupAllUserDuplicates = useCallback(async () => {
    if (!userId || !APPWRITE_DATABASE_ID || !APPWRITE_READHISTORY_COLLECTION_ID) return;
    console.log('[ReadHistory] Starting global cleanup of duplicate read history documents...');

    const globalCleanupKey = `global_cleanup_${userId}`;

    // Check if global cleanup is already in progress
    if (cleanupInProgress.has(globalCleanupKey)) {
      console.log('[ReadHistory] Global cleanup already in progress, skipping...');
      return;
    }

    // Mark global cleanup as in progress
    setCleanupInProgress(prev => new Set(prev).add(globalCleanupKey));

    try {
      // Get all documents for the user (using pagination)
      let allDocs: any[] = [];
      let lastId: string | null = null;
      const pageLimit = 100;

      while (true) {
        const queries = [
          Query.equal('userId', userId),
          Query.limit(pageLimit),
          Query.orderDesc('readAt')
        ];

        if (lastId) {
          queries.push(Query.cursorAfter(lastId));
        }

        console.log(`[ReadHistory] Fetching all documents for cleanup (page ${Math.floor(allDocs.length / pageLimit) + 1})`);
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_READHISTORY_COLLECTION_ID,
          queries
        );
        console.log(`[ReadHistory] Received ${response.documents.length} documents for cleanup check`);

        if (response.documents.length === 0) break;

        allDocs = [...allDocs, ...response.documents];

        if (response.documents.length < pageLimit) break;

        lastId = response.documents[response.documents.length - 1].$id;

        // Add delay between pagination requests
        if (response.documents.length === pageLimit) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`[ReadHistory] Found ${allDocs.length} total documents, checking for duplicates...`);

      // Group documents by manga + chapter
      const chapterGroups = new Map<string, any[]>();

      for (const doc of allDocs) {
        const key = `${doc.mangaId}_${doc.chapterNumber}`;
        if (!chapterGroups.has(key)) {
          chapterGroups.set(key, []);
        }
        chapterGroups.get(key)!.push(doc);
      }

      // Process each chapter group
      let totalDuplicatesRemoved = 0;
      let chaptersWithDuplicates = 0;

      for (const [chapterKey, docs] of chapterGroups) {
        if (docs.length > 1) {
          chaptersWithDuplicates++;
          console.log(`[ReadHistory] Chapter ${chapterKey} has ${docs.length} documents, cleaning up...`);

          // Sort by readAt descending (most recent first)
          const sortedDocs = docs.sort((a: any, b: any) => {
            const aTime = normalizeTimestamp(a.readAt);
            const bTime = normalizeTimestamp(b.readAt);
            return bTime - aTime;
          });

          // Delete all except the most recent
          const docsToDelete = sortedDocs.slice(1);

          for (const doc of docsToDelete) {
            try {
              console.log(`[ReadHistory] Deleting duplicate document ${doc.$id} in global cleanup`);
              await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_READHISTORY_COLLECTION_ID,
                doc.$id
              );
              totalDuplicatesRemoved++;
              
              // Add delay to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (deleteError: any) {
              if (!deleteError.message?.includes('could not be found')) {
                console.error(`[ReadHistory] Failed to delete duplicate document ${doc.$id}:`, deleteError);
              }
            }
          }
        }
      }

      console.log(`[ReadHistory] Global cleanup complete: Removed ${totalDuplicatesRemoved} duplicate documents across ${chaptersWithDuplicates} chapters`);

      if (totalDuplicatesRemoved > 0) {
        // Refresh history after cleanup
        await refreshHistory();
      }
    } catch (error) {
      console.error('[ReadHistory] Error during global duplicate cleanup:', error);
    } finally {
      // Remove from in-progress set
      setCleanupInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(globalCleanupKey);
        return newSet;
      });
    }
  }, [userId, refreshHistory]);

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
      cleanupDuplicateDocuments,
      cleanupAllUserDuplicates,
    }),
    [history, isLoading, isSyncing, isAuthenticated, addToHistory, removeFromHistory, clearHistory, getChaptersForManga, getLastReadChapter, refreshHistory, cleanupDuplicateDocuments, cleanupAllUserDuplicates]
  );

  return (
    <ReadHistoryContext.Provider value={value}>
      {children}
    </ReadHistoryContext.Provider>
  );
};

export const useReadHistory = () => {
  const ctx = useContext(ReadHistoryContext);
  if (!ctx) throw new Error('useReadHistory must be used within a ReadHistoryProvider');
  return ctx;
};
