import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, databases } from '../lib/appwrite'; // Import Appwrite services
import { ID, Query, Permission, Role } from 'appwrite'; // Import Appwrite helper methods
import Constants from 'expo-constants'; // Import Constants for environment variables
import { showErrorAlert, showSuccessAlert } from '../components/CustomAlert';

// Get database and collection IDs from expo constants
const APPWRITE_DATABASE_ID = Constants.expoConfig?.extra?.appwriteDatabaseId;
const APPWRITE_WATCHHISTORY_COLLECTION_ID = Constants.expoConfig?.extra?.appwriteWatchHistoryCollectionId;

const safeDbId = APPWRITE_DATABASE_ID;
const safeCollectionId = APPWRITE_WATCHHISTORY_COLLECTION_ID;

// Define the structure for watch history items
export interface WatchHistoryItem {
  id: string;                  // anime id
  episodeNumber: string;       // episode number
  audioType: 'sub' | 'dub';    // sub or dub
  englishName: string;         // anime name
  thumbnailUrl: string;        // thumbnail URL
  watchedAt: number;           // timestamp when watched
  position: number;            // playback position in milliseconds
  duration: number;            // total duration in milliseconds
  documentId?: string;         // Appwrite document ID
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
  syncHistory: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create the context
const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined);

export const WatchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Track last cloud update time to limit Appwrite API calls
  const [lastCloudUpdateTime, setLastCloudUpdateTime] = useState<Record<string, number>>({});
  
  // Helper function to add delay between Appwrite operations to prevent rate limiting
  const delayOperation = (ms: number = 5000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));  // 5 seconds delay
  };

  // Throttle cloud updates - only update if 10 seconds have passed since last update for this item
  const shouldUpdateCloud = (animeId: string, episodeNumber: string): boolean => {
    const key = `${animeId}_${episodeNumber}`;
    const lastUpdate = lastCloudUpdateTime[key] || 0;
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate;
    
    // Only update if 10 seconds have passed since the last cloud update for this item
    return timeSinceLastUpdate > 10000; // 10 seconds
  };

  // Mark an item as updated in the cloud
  const markCloudUpdated = (animeId: string, episodeNumber: string): void => {
    const key = `${animeId}_${episodeNumber}`;
    setLastCloudUpdateTime(prev => ({
      ...prev,
      [key]: Date.now()
    }));
  };

  // Check if user is authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const session = await account.getSession('current');
        setUserId(session.userId);
        setIsAuthenticated(true);
      } catch (error) {
        console.log('User not authenticated:', error);
        setUserId(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Function to fetch history from Appwrite
  const fetchCloudHistory = async (): Promise<WatchHistoryItem[]> => {
    if (!userId) return [];
    
    try {
      let allResults: WatchHistoryItem[] = [];
      let lastId: string | null = null;
      const pageLimit = 100; // Fetch more items per request for efficiency
      
      // Use cursor-based pagination to fetch all documents
      while (true) {
        // Build the query
        const queries = [
          Query.equal('userId', userId),
          Query.limit(pageLimit) // Set page size for better performance
        ];
        
        // Add cursor pagination if we have a last ID
        if (lastId) {
          queries.push(Query.cursorAfter(lastId));
        }
        
        console.log(`Fetching history page${lastId ? ' after ' + lastId : ''}`);
        
        // Fetch the documents
        const response = await databases.listDocuments(
          safeDbId,
          safeCollectionId,
          queries
        );

        // If no documents returned, break the loop
        if (response.documents.length === 0) {
          break;
        }
        
        // Map to our history item format
        const cloudHistory: WatchHistoryItem[] = response.documents.map(doc => ({
          id: doc.animeId,
          episodeNumber: doc.episodeNumber,
          audioType: doc.audioType,
          englishName: doc.englishName,
          thumbnailUrl: doc.thumbnailUrl,
          watchedAt: doc.watchedAt,
          position: doc.position,
          duration: doc.duration,
          documentId: doc.$id
        }));
        
        // Add the current batch to our results
        allResults = [...allResults, ...cloudHistory];
        
        // If we got fewer documents than the limit, we've reached the end
        if (response.documents.length < pageLimit) {
          break;
        }
        
        // Update the cursor for the next page
        lastId = response.documents[response.documents.length - 1].$id;
      }
      
      console.log(`Fetched ${allResults.length} total history items with pagination`);
      return allResults;
    } catch (error) {
      // Collection might not exist yet, which is okay
      console.log('Something went wrong with pagination: ', error);
      return [];
    }
  };

  // Load history from Appwrite when authenticated
  useEffect(() => {
    const loadCloudHistory = async () => {
      if (!userId) {
        setHistory([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        // Get cloud history
        console.log("Fetching cloud watch history...");
        const cloudItems = await fetchCloudHistory();
        console.log(`Fetched ${cloudItems.length} items from cloud watch history`);
        
        // Sort by most recently watched
        cloudItems.sort((a, b) => b.watchedAt - a.watchedAt);
        
        // Update state
        setHistory(cloudItems);
        console.log("Watch history load from cloud complete");
      } catch (error) {
        console.error('Error loading watch history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCloudHistory();
  }, [userId]);

  // Add an item to watch history
  const addToHistory = async (item: Omit<WatchHistoryItem, 'documentId' | 'watchedAt'>) => {
    if (!userId) {
      console.log('Cannot add to watch history: User not authenticated');
      return;
    }
    
    try {
      const watchedAt = Date.now();
      
      // Check if item already exists in history
      const existingIndex = history.findIndex(
        h => h.id === item.id && h.episodeNumber === item.episodeNumber
      );

      // Create new or update existing item
      let updatedHistory: WatchHistoryItem[];
      let newItem: WatchHistoryItem;

      if (existingIndex !== -1) {
        // Update existing item
        newItem = {
          ...history[existingIndex],
          position: item.position,
          duration: item.duration,
          watchedAt: watchedAt,
          audioType: item.audioType
        };
        
        updatedHistory = [...history];
        updatedHistory[existingIndex] = newItem;
        
        // Only update cloud if enough time has passed since last update
        if (shouldUpdateCloud(item.id, item.episodeNumber)) {
          console.log(`Updating cloud position for ${item.id}, ep ${item.episodeNumber}`);
          await databases.updateDocument(
            safeDbId,
            safeCollectionId,
            history[existingIndex].documentId as string,
            {
              position: Math.floor(item.position), // Ensure integer
              duration: Math.floor(item.duration), // Ensure integer
              watchedAt: watchedAt,
              audioType: item.audioType
            }
          );
          markCloudUpdated(item.id, item.episodeNumber);
        } else {
          console.log(`Skipping cloud update for ${item.id}, ep ${item.episodeNumber} (too soon)`);
        }
      } else {
        // Create new item
        try {
          const response = await databases.createDocument(
            safeDbId,
            safeCollectionId,
            ID.unique(),
            {
              userId: userId,
              animeId: item.id,
              episodeNumber: item.episodeNumber,
              audioType: item.audioType,
              englishName: item.englishName,
              thumbnailUrl: item.thumbnailUrl,
              watchedAt: watchedAt,
              position: Math.floor(item.position), // Ensure integer
              duration: Math.floor(item.duration)  // Ensure integer
            },
            // Add permissions
            [
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId))
            ]
          );
          
          // Add the new item with document ID
          newItem = {
            ...item,
            watchedAt: watchedAt,
            documentId: response.$id
          };
          
          updatedHistory = [newItem, ...history];
          markCloudUpdated(item.id, item.episodeNumber);
        } catch (error) {
          console.error('Failed to create document in Appwrite:', error);
          return;
        }
      }

      // Sort by most recent
      updatedHistory.sort((a, b) => b.watchedAt - a.watchedAt);
      
      // Update state
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to add to watch history:', error);
    }
  };

  // Remove an item from history
  const removeFromHistory = async (animeId: string, episodeNumber: string) => {
    if (!userId) {
      console.log('Cannot remove from watch history: User not authenticated');
      return;
    }
    
    try {
      // Find the item
      const itemIndex = history.findIndex(
        item => item.id === animeId && item.episodeNumber === episodeNumber
      );
      
      if (itemIndex === -1) return;
      
      const item = history[itemIndex];
      
      // Remove from Appwrite if document ID exists
      if (item.documentId) {
        try {
          await databases.deleteDocument(
            safeDbId,
            safeCollectionId,
            item.documentId
          );
        } catch (error) {
          console.error('Failed to delete watch history from Appwrite:', error);
          return;
        }
      }
      
      // Update local state
      const updatedHistory = history.filter((_, index) => index !== itemIndex);
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to remove from watch history:', error);
    }
  };

  // Clear all history
  const clearHistory = async () => {
    if (!userId) {
      console.log('Cannot clear watch history: User not authenticated');
      showErrorAlert('Error', 'You must be logged in to clear your watch history');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Delete each item from Appwrite
      for (const item of history) {
        if (item.documentId) {
          try {
            await databases.deleteDocument(
              safeDbId,
              safeCollectionId,
              item.documentId
            );
          } catch (error) {
            console.error(`Failed to delete document ${item.documentId}:`, error);
          }
        }
      }
      
      // Clear local state
      setHistory([]);
      showSuccessAlert('Success', 'Watch history cleared successfully');
    } catch (error) {
      console.error('Failed to clear watch history:', error);
      showErrorAlert('Error', 'Failed to clear watch history');
    } finally {
      setIsLoading(false);
    }
  };

  // Get all watched episodes for a specific anime
  const getWatchedEpisodes = (animeId: string): WatchHistoryItem[] => {
    return history.filter(item => item.id === animeId);
  };

  // Check if an episode has been watched
  const isEpisodeWatched = (animeId: string, episodeNumber: string): boolean => {
    return history.some(item => item.id === animeId && item.episodeNumber === episodeNumber);
  };

  // Get the last watched episode for a specific anime
  const getLastWatchedEpisode = (animeId: string): WatchHistoryItem | null => {
    const animeHistory = getWatchedEpisodes(animeId);
    
    if (animeHistory.length === 0) return null;
    
    // Sort by most recently watched and return the first item
    animeHistory.sort((a, b) => b.watchedAt - a.watchedAt);
    return animeHistory[0];
  };

  // Function to refresh cloud history (to be called after login)
  const refreshWatchHistory = async () => {
    try {
      setIsLoading(true);
      setIsSyncing(true);
      console.log("Refreshing watch history from cloud...");
      
      // Explicitly check auth status from Appwrite to ensure we have the latest info
      try {
        const session = await account.getSession('current');
        if (session) {
          // Update userId if needed
          if (!userId || userId !== session.userId) {
            console.log(`Setting userId to ${session.userId}`);
            setUserId(session.userId);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.log("Not authenticated in refreshWatchHistory:", err);
        setIsAuthenticated(false);
        setUserId(null);
        setHistory([]);
        setIsLoading(false);
        setIsSyncing(false);
        return [];
      }
      
      if (!userId) {
        console.log("User not authenticated, skipping cloud history refresh");
        setHistory([]);
        setIsLoading(false);
        setIsSyncing(false);
        return [];
      }
      
      console.log(`Fetching cloud history for user ${userId}`);
      // Get cloud history
      const cloudItems = await fetchCloudHistory();
      console.log(`Fetched ${cloudItems.length} items from cloud watch history`);
      
      // Sort by most recently watched
      cloudItems.sort((a, b) => b.watchedAt - a.watchedAt);
      
      // Always update the state to ensure we have the latest data
      setHistory(cloudItems);
      
      console.log(`Refreshed watch history with ${cloudItems.length} total items`);
      
      return cloudItems;
    } catch (error) {
      console.error('Error refreshing watch history:', error);
      return history; // Return current history on error
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Function to sync history with cloud storage
  const syncHistory = async () => {
    // This implementation uses only cloud storage, so syncing is just refreshing data from cloud
    if (!userId) {
      showErrorAlert("Not logged in", "Please log in to sync your watch history.");
      return;
    }
    
    try {
      setIsSyncing(true);
      await refreshWatchHistory();
      showSuccessAlert("Sync Complete", "Your watch history has been updated.");
    } catch (error) {
      console.error('Error syncing watch history:', error);
      showErrorAlert("Sync Failed", "There was a problem syncing your watch history.");
    } finally {
      setIsSyncing(false);
    }
  };

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
        syncHistory,
        isAuthenticated
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
};

// Custom hook to use the watch history context
export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (context === undefined) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};