import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { account, databases } from '../lib/appwrite';
import { ID, Permission, Query, Role } from 'appwrite';
import Constants from 'expo-constants';
import { showErrorAlert } from '../components/CustomAlert';

const APPWRITE_DATABASE_ID = Constants.expoConfig?.extra?.appwriteDatabaseId;
const APPWRITE_READLIST_COLLECTION_ID = Constants.expoConfig?.extra?.appwriteReadlistCollectionId;

if (!APPWRITE_DATABASE_ID || !APPWRITE_READLIST_COLLECTION_ID) {
  throw new Error('Missing Appwrite configuration for readlist.');
}

export interface ReadlistItem {
  id: string;             // manga id
  title: string;          // display title
  thumbnailUrl?: string;  // cover image
  dateAdded: number;      // epoch ms
  documentId?: string;    // Appwrite document id
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
  sortReadlist: (by: 'recent' | 'name') => void;
}

const ReadlistContext = createContext<ReadlistContextValue | undefined>(undefined);

const sortReadlistItems = (items: ReadlistItem[], by: 'recent' | 'name'): ReadlistItem[] => {
  const sorted = [...items];
  if (by === 'recent') {
    sorted.sort((a, b) => b.dateAdded - a.dateAdded);
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted;
};

export const ReadlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [readlist, setReadlist] = useState<ReadlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await account.getSession('current');
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch (err) {
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchCloudReadlist = async (): Promise<ReadlistItem[]> => {
    if (!userId) return [];

    try {
      let all: ReadlistItem[] = [];
      let lastId: string | null = null;
      const pageLimit = 100;

      while (true) {
        const queries = [Query.equal('userId', userId), Query.limit(pageLimit)];
        if (lastId) queries.push(Query.cursorAfter(lastId));

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_READLIST_COLLECTION_ID,
          queries
        );

        if (response.documents.length === 0) break;

        const batch: ReadlistItem[] = response.documents.map((doc) => {
          const rawDate = (doc as unknown as Record<string, unknown>).dateAdded;
          const dateAdded =
            typeof rawDate === 'string'
              ? new Date(rawDate).getTime()
              : typeof rawDate === 'number'
              ? rawDate
              : Date.now();

          return {
            id: doc.mangaId,
            title: doc.title,
            thumbnailUrl: doc.thumbnailUrl,
            dateAdded,
            documentId: doc.$id,
          };
        });

        all = [...all, ...batch];

        if (response.documents.length < pageLimit) break;
        lastId = response.documents[response.documents.length - 1].$id;
      }

      // Sort newest first by default
      return sortReadlistItems(all, 'recent');
    } catch (error) {
      console.error('Failed to fetch readlist from Appwrite:', error);
      return [];
    }
  };

  // Load cloud readlist when auth changes
  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setReadlist([]);
        return;
      }

      setIsLoading(true);
      try {
        const cloud = await fetchCloudReadlist();
        setReadlist(cloud);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId]);

  const refreshReadlist = async () => {
    setIsSyncing(true);
    try {
      let sessionUserId: string | null = null;
      try {
        const session = await account.getSession('current');
        sessionUserId = session.userId;
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
        setUserId(null);
        setReadlist([]);
        return;
      }

      if (sessionUserId) {
        const cloud = await fetchCloudReadlist();
        setReadlist(cloud);
      }
    } catch (err) {
      console.error('Error refreshing readlist:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const isInReadlist = (id: string) => readlist.some(item => item.id === id);

  const toggleReadlist = async (item: { id: string; title: string; thumbnail?: string }) => {
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

    setReadlist(prev => [...prev, newEntry]);

    try {
      const response = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_READLIST_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          mangaId: item.id,
          title: item.title || 'Unknown Manga',
          thumbnailUrl: item.thumbnail || '',
          dateAdded: new Date(now).toISOString(),
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]
      );

      setReadlist(prev => prev.map(entry => entry.id === item.id ? { ...entry, documentId: response.$id } : entry));
    } catch (error) {
      console.error('Failed to add to readlist:', error);
      setReadlist(prev => prev.filter(entry => entry.id !== item.id));
      showErrorAlert('Failed to Add', 'Could not add the manga to your readlist.');
    }
  };

  const removeFromReadlist = async (id: string) => {
    const toRemove = readlist.find(item => item.id === id);
    if (!toRemove) return;

    setReadlist(prev => prev.filter(item => item.id !== id));

    if (userId && toRemove.documentId) {
      try {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_READLIST_COLLECTION_ID,
          toRemove.documentId
        );
      } catch (error) {
        console.error('Failed to remove from readlist:', error);
        setReadlist(prev => [...prev, toRemove]);
        showErrorAlert('Failed to Remove', 'Could not remove the manga from your readlist.');
      }
    }
  };

  const clearReadlist = async () => {
    const snapshot = [...readlist];
    setReadlist([]);

    if (userId) {
      try {
        const deletions = snapshot
          .filter(item => item.documentId)
          .map(item => databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_READLIST_COLLECTION_ID, item.documentId as string));
        await Promise.allSettled(deletions);
      } catch (error) {
        console.error('Failed to clear readlist:', error);
        setReadlist(snapshot);
        showErrorAlert('Failed to Clear', 'Could not clear your readlist.');
      }
    }
  };

  const sortReadlist = (by: 'recent' | 'name') => {
    setReadlist(prev => sortReadlistItems(prev, by));
  };

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
      sortReadlist,
    }),
    [readlist, isLoading, isSyncing, isAuthenticated]
  );

  return <ReadlistContext.Provider value={value}>{children}</ReadlistContext.Provider>;
};

export const useReadlist = () => {
  const context = useContext(ReadlistContext);
  if (!context) {
    throw new Error('useReadlist must be used within a ReadlistProvider');
  }
  return context;
};
