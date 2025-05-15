import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases } from '../lib/appwrite'; // Import Appwrite services
import { ID, Query, Permission, Role } from 'appwrite'; // Import Appwrite helper methods
import Constants from 'expo-constants'; // Import Constants for environment variables
import { Alert } from 'react-native';

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

// Storage key for local history
const WATCH_HISTORY_STORAGE_KEY = '@kaizen_watch_history';
// Playback position storage key prefix (compatible with existing code)
const PLAYBACK_POSITION_KEY_PREFIX = '@kaizen_playback_position_';

interface WatchHistoryContextType {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'documentId' | 'watchedAt'>) => Promise<void>;
  removeFromHistory: (animeId: string, episodeNumber: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getWatchedEpisodes: (animeId: string) => WatchHistoryItem[];
  isEpisodeWatched: (animeId: string, episodeNumber: string) => boolean;
  getLastWatchedEpisode: (animeId: string) => WatchHistoryItem | null;
  isLoading: boolean;
  syncHistory: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create the context
const WatchHistoryContext = createContext<WatchHistoryContextType | undefined>(undefined);

export const WatchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  // Load watch history from AsyncStorage on component mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        }

        // Also load the old playback position keys to migrate them
        await migrateOldPlaybackData();
      } catch (error) {
        console.error('Failed to load watch history from storage:', error);
      }
    };

    loadHistory();
  }, []);

  // Migrate old playback position data to new format
  const migrateOldPlaybackData = async () => {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      // Filter keys that match the old pattern
      const playbackKeys = allKeys.filter(key => key.startsWith(PLAYBACK_POSITION_KEY_PREFIX));

      const migratedItems: WatchHistoryItem[] = [];

      for (const key of playbackKeys) {
        // Parse the key to get animeId, episode, and audioType
        // Format: @kaizen_playback_position_${id}_${episode}_${audioType}
        const keyParts = key.split('_');
        if (keyParts.length >= 6) {
          const animeId = keyParts[3];
          const episodeNumber = keyParts[4];
          const audioType = keyParts[5] as 'sub' | 'dub';
          
          const position = await AsyncStorage.getItem(key);
          if (position) {
            // Create a new history item with basic info
            migratedItems.push({
              id: animeId,
              episodeNumber,
              audioType,
              englishName: 'Unknown Anime', // Default value
              thumbnailUrl: '',             // Default value
              watchedAt: Date.now(),        // Current time as default
              position: parseInt(position, 10),
              duration: 0                   // Unknown duration
            });
          }
        }
      }

      if (migratedItems.length > 0) {
        // Merge with existing history items
        const updatedHistory = [...history];
        
        for (const item of migratedItems) {
          // Check if this item already exists
          const existingIndex = updatedHistory.findIndex(
            h => h.id === item.id && h.episodeNumber === item.episodeNumber
          );
          
          if (existingIndex === -1) {
            // Add if it doesn't exist
            updatedHistory.push(item);
          } else if (updatedHistory[existingIndex].position < item.position) {
            // Update if new position is greater
            updatedHistory[existingIndex] = {
              ...updatedHistory[existingIndex],
              position: item.position,
              watchedAt: Date.now()
            };
          }
        }
        
        // Save the updated history
        setHistory(updatedHistory);
        await AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      }
    } catch (error) {
      console.error('Failed to migrate playback data:', error);
    }
  };

  // Function to save local history
  const saveLocalHistory = async (items: WatchHistoryItem[]) => {
    try {
      await AsyncStorage.setItem(WATCH_HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save watch history to local storage:', error);
    }
  };

  // Function to fetch history from Appwrite
  const fetchCloudHistory = async (): Promise<WatchHistoryItem[]> => {
    if (!userId) return [];
    
    try {
      // Try to list all documents for the current user
      const response = await databases.listDocuments(
        safeDbId,
        safeCollectionId,
        [Query.equal('userId', userId)]
      );

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
      
      return cloudHistory;
    } catch (error) {
      // Collection might not exist yet, which is okay
      console.log('Something went wrong: ', error);
      return [];
    }
  };

  // Load history from Appwrite when authenticated
  useEffect(() => {
    const loadCloudHistory = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Get cloud history
        const cloudItems = await fetchCloudHistory();
        
        // Load local history
        const storedHistory = await AsyncStorage.getItem(WATCH_HISTORY_STORAGE_KEY);
        const localItems: WatchHistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];
        
        // Merge cloud and local history
        // If item exists in cloud, use cloud version
        // If item exists only locally, keep it
        const cloudKeys = new Set(cloudItems.map(item => `${item.id}_${item.episodeNumber}`));
        const uniqueLocalItems = localItems.filter(
          item => !cloudKeys.has(`${item.id}_${item.episodeNumber}`)
        );
        
        // Combined history prioritizes cloud items but keeps unique local ones
        const combined = [...cloudItems, ...uniqueLocalItems];
        
        // Sort by most recently watched
        combined.sort((a, b) => b.watchedAt - a.watchedAt);
        
        // Update state and save locally
        setHistory(combined);
        await saveLocalHistory(combined);
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
      } else {
        // Create new item
        newItem = {
          ...item,
          watchedAt: watchedAt
        };
        
        updatedHistory = [newItem, ...history];
      }

      // Sort by most recent
      updatedHistory.sort((a, b) => b.watchedAt - a.watchedAt);
      
      // Update state and save locally
      setHistory(updatedHistory);
      await saveLocalHistory(updatedHistory);
      
      // Save to Appwrite if authenticated
      if (userId) {
        try {
          const existingDocumentId = existingIndex !== -1 
            ? history[existingIndex].documentId
            : undefined;

          // Only perform cloud operations if enough time has passed since last update
          if (existingDocumentId) {
            // Update existing document only if 10 seconds have passed since the last update
            if (shouldUpdateCloud(item.id, item.episodeNumber)) {
              console.log(`Updating cloud position for ${item.id}, ep ${item.episodeNumber} after throttle period`);
              await databases.updateDocument(
                safeDbId,
                safeCollectionId,
                existingDocumentId,
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
            // Create new document
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
            
            // Update the item with the document ID
            if (existingIndex !== -1) {
              const newHistory = [...updatedHistory];
              newHistory[existingIndex] = {
                ...newHistory[existingIndex],
                documentId: response.$id
              };
              setHistory(newHistory);
              await saveLocalHistory(newHistory);
            } else {
              const newItemWithDocId = {
                ...newItem,
                documentId: response.$id
              };
              
              const newHistory = updatedHistory.map(h =>
                h.id === item.id && h.episodeNumber === item.episodeNumber
                  ? newItemWithDocId
                  : h
              );
              
              setHistory(newHistory);
              await saveLocalHistory(newHistory);
            }
          }
        } catch (error) {
          console.error('Failed to save watch history to Appwrite:', error);
          throw error; // Rethrow to handle in the calling function 
          // Continue with local changes even if cloud sync fails
        }
      }

      // Also save to the old playback position format for backward compatibility
      const legacyKey = `${PLAYBACK_POSITION_KEY_PREFIX}${item.id}_${item.episodeNumber}_${item.audioType}`;
      await AsyncStorage.setItem(legacyKey, item.position.toString());

    } catch (error) {
      console.error('Failed to add to watch history:', error);
    }
  };

  // Remove an item from history
  const removeFromHistory = async (animeId: string, episodeNumber: string) => {
    try {
      // Find the item
      const itemIndex = history.findIndex(
        item => item.id === animeId && item.episodeNumber === episodeNumber
      );
      
      if (itemIndex === -1) return;
      
      const item = history[itemIndex];
      
      // Update local state
      const updatedHistory = history.filter((_, index) => index !== itemIndex);
      setHistory(updatedHistory);
      await saveLocalHistory(updatedHistory);
      
      // Remove from Appwrite if authenticated and document ID exists
      if (userId && item.documentId) {
        try {
          await databases.deleteDocument(
            safeDbId,
            safeCollectionId,
            item.documentId
          );
        } catch (error) {
          console.error('Failed to delete watch history from Appwrite:', error);
        }
      }
      
      // Remove from old playback position format
      const legacyKey = `${PLAYBACK_POSITION_KEY_PREFIX}${animeId}_${episodeNumber}_${item.audioType}`;
      await AsyncStorage.removeItem(legacyKey);
      
    } catch (error) {
      console.error('Failed to remove from watch history:', error);
    }
  };

  // Clear all history
  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(WATCH_HISTORY_STORAGE_KEY);
      
      // Clear from Appwrite if authenticated
      if (userId) {
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
      }
      
      // Also clear old playback position format keys
      const allKeys = await AsyncStorage.getAllKeys();
      const playbackKeys = allKeys.filter(key => key.startsWith(PLAYBACK_POSITION_KEY_PREFIX));
      if (playbackKeys.length > 0) {
        await AsyncStorage.multiRemove(playbackKeys);
      }
      
      Alert.alert('Success', 'Watch history cleared successfully');
    } catch (error) {
      console.error('Failed to clear watch history:', error);
      Alert.alert('Error', 'Failed to clear watch history');
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

  // Function to sync local history to cloud
  const syncHistory = async () => {
    if (!userId) {
      Alert.alert("Not logged in", "Please log in to sync your watch history.");
      return;
    }
    
    try {
      // Get existing cloud history
      const cloudItems = await fetchCloudHistory();
      const cloudMap = new Map(
        cloudItems.map(item => [`${item.id}_${item.episodeNumber}`, item])
      );
      
      // Items to add or update in cloud
      const itemsToSync = history.filter(
        item => !cloudMap.has(`${item.id}_${item.episodeNumber}`) || !item.documentId
      );
      
      if (itemsToSync.length === 0) {
        Alert.alert("Sync Complete", "Your watch history is already up to date.");
        return;
      }
      
      // Add each item to cloud
      for (const item of itemsToSync) {
        try {
          // Add a delay before each document creation to prevent rate limiting
          await delayOperation(5000);
          
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
              watchedAt: item.watchedAt,
              position: item.position,
              duration: item.duration
            },
            // Add permissions
            [
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId))
            ]
          );
          
          // Update the item with document ID
          item.documentId = response.$id;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}_${item.episodeNumber} to cloud:`, error);
        }
      }
      
      // Update local storage with document IDs
      await saveLocalHistory(history);
      
      Alert.alert("Sync Complete", "Your watch history has been synced to the cloud.");
    } catch (error) {
      console.error('Error syncing watch history:', error);
      Alert.alert("Sync Failed", "There was a problem syncing your watch history.");
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