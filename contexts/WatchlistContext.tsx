import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases } from '../lib/appwrite'; // Import Appwrite services
import { ID, Query, Permission, Role } from 'appwrite'; // Import Appwrite helper methods
import Constants from 'expo-constants'; // Import Constants for environment variables
import { Alert } from 'react-native';

// Get database and collection IDs from expo constants
const APPWRITE_DATABASE_ID = Constants.expoConfig?.extra?.appwriteDatabaseId;
const APPWRITE_WATCHLIST_COLLECTION_ID = Constants.expoConfig?.extra?.appwriteWatchlistCollectionId;

// Check if configuration is available
if (!APPWRITE_DATABASE_ID || !APPWRITE_WATCHLIST_COLLECTION_ID) {
  throw new Error('Missing Appwrite database configuration (Database ID or Watchlist Collection ID).');
}

// Define the structure of watchlist items
export interface WatchlistItem {
  id: string;
  englishName: string;
  thumbnailUrl: string;
  dateAdded: number;
  documentId?: string; // Add Appwrite document ID
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
  syncWatchlist: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create the context
const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

// Storage key for backup and offline access
const WATCHLIST_STORAGE_KEY = '@kaizen_watchlist';

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [collectionInitialized, setCollectionInitialized] = useState<boolean>(false);

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

  // Load watchlist from AsyncStorage on component mount (for offline access and non-authenticated users)
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const storedWatchlist = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (storedWatchlist) {
          setWatchlist(JSON.parse(storedWatchlist));
        }
      } catch (error) {
        console.error('Failed to load watchlist from storage:', error);
      }
    };

    loadWatchlist();
  }, []);

  // Function to save local watchlist
  const saveLocalWatchlist = async (items: WatchlistItem[]) => {
    try {
      await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save watchlist to local storage:', error);
    }
  };

  // Function to fetch watchlist from Appwrite
  const fetchCloudWatchlist = async (): Promise<WatchlistItem[]> => {
    if (!userId) return [];
    
    try {
      // First, try to list all documents without filtering
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_WATCHLIST_COLLECTION_ID
      );

      // Filter to only include documents for the current user
      const cloudWatchlist: WatchlistItem[] = response.documents
        .filter(doc => doc.userId === userId)
        .map(doc => ({
          id: doc.animeId,
          englishName: doc.englishName,
          thumbnailUrl: doc.thumbnailUrl,
          dateAdded: doc.dateAdded,
          documentId: doc.$id
        }));
      
      setCollectionInitialized(true);
      return cloudWatchlist;
    } catch (error) {
      console.error('Failed to fetch watchlist from Appwrite:', error);
      return [];
    }
  };

  // Load watchlist from Appwrite when authenticated
  useEffect(() => {
    const loadCloudWatchlist = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Get cloud watchlist
        const cloudItems = await fetchCloudWatchlist();
        
        // Load local watchlist
        const storedWatchlist = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        const localItems: WatchlistItem[] = storedWatchlist ? JSON.parse(storedWatchlist) : [];
        
        // Merge cloud and local watchlist
        // If item exists in cloud, use cloud version
        // If item exists only locally, keep it
        const cloudIds = new Set(cloudItems.map(item => item.id));
        const uniqueLocalItems = localItems.filter(item => !cloudIds.has(item.id));
        
        // Combined watchlist prioritizes cloud items but keeps unique local ones
        const combined = [...cloudItems, ...uniqueLocalItems];
        
        // Update state and save locally
        setWatchlist(combined);
        await saveLocalWatchlist(combined);
      } catch (error) {
        console.error('Error loading watchlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCloudWatchlist();
  }, [userId]);

  // Public function to refresh watchlist data
  const refreshWatchlist = async () => {
    try {
      setIsLoading(true);
      // If user is authenticated, fetch from Appwrite and merge with local
      if (userId) {
        const cloudItems = await fetchCloudWatchlist();
        
        // Load current local items
        const storedWatchlist = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        const localItems: WatchlistItem[] = storedWatchlist ? JSON.parse(storedWatchlist) : [];
        
        // Find unique local items
        const cloudIds = new Set(cloudItems.map(item => item.id));
        const uniqueLocalItems = localItems.filter(item => !cloudIds.has(item.id));
        
        // Combined watchlist
        const combined = [...cloudItems, ...uniqueLocalItems];
        
        setWatchlist(combined);
        await saveLocalWatchlist(combined);
      } else {
        // Otherwise, just load from AsyncStorage
        const storedWatchlist = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (storedWatchlist) {
          setWatchlist(JSON.parse(storedWatchlist));
        }
      }
    } catch (error) {
      console.error('Error refreshing watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to sync local watchlist to cloud
  const syncWatchlist = async () => {
    if (!userId) {
      Alert.alert("Not logged in", "Please log in to sync your watchlist.");
      return;
    }
    
    setIsSyncing(true);
    try {
      // Get existing cloud watchlist
      const cloudItems = await fetchCloudWatchlist();
      const cloudIdsMap = new Map(cloudItems.map(item => [item.id, item]));
      
      // Get all items that need to be added to cloud
      const itemsToAdd = watchlist.filter(item => !cloudIdsMap.has(item.id));
      
      // Add each item to cloud
      for (const item of itemsToAdd) {
        try {
          const response = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_WATCHLIST_COLLECTION_ID,
            ID.unique(),
            {
              userId: userId,
              animeId: item.id,
              englishName: item.englishName,
              thumbnailUrl: item.thumbnailUrl,
              dateAdded: item.dateAdded
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
          console.error(`Failed to add item ${item.id} to cloud:`, error);
        }
      }
      
      // After sync, update the local watchlist with all document IDs
      await saveLocalWatchlist(watchlist);
      
      Alert.alert("Sync Complete", "Your watchlist has been synced to the cloud.");
    } catch (error) {
      console.error('Error syncing watchlist:', error);
      Alert.alert("Sync Failed", "There was a problem syncing your watchlist.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Check if an item is in the watchlist
  const isInWatchlist = (id: string) => {
    return watchlist.some(item => item.id === id);
  };

  // Add or remove an item from watchlist
  const toggleWatchlist = async (id: string, name: string | undefined, thumbnailUrl: string | undefined) => {
    if (isInWatchlist(id)) {
      await removeFromWatchlist(id);
    } else {
      const newItem: WatchlistItem = {
        id,
        englishName: name || 'Unknown Anime',
        thumbnailUrl: thumbnailUrl || '',
        dateAdded: Date.now()
      };
      
      // Add to local state first for UI responsiveness
      const updatedWatchlist = [...watchlist, newItem];
      setWatchlist(updatedWatchlist);
      
      // Always update local storage
      await saveLocalWatchlist(updatedWatchlist);
      
      // Then sync with Appwrite if user is authenticated
      if (userId) {
        try {
          const response = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_WATCHLIST_COLLECTION_ID,
            ID.unique(),
            {
              userId: userId,
              animeId: id,
              englishName: name || 'Unknown Anime',
              thumbnailUrl: thumbnailUrl || '',
              dateAdded: Date.now()
            },
            // Add permissions
            [
              Permission.read(Role.user(userId)),
              Permission.update(Role.user(userId)),
              Permission.delete(Role.user(userId))
            ]
          );
          
          // Update the item with document ID
          setWatchlist(prev => 
            prev.map(item => 
              item.id === id ? { ...item, documentId: response.$id } : item
            )
          );
          
          // Update local storage with the document ID
          const itemWithDocId = { ...newItem, documentId: response.$id };
          await saveLocalWatchlist([...watchlist.filter(item => item.id !== id), itemWithDocId]);
          
          // Collection is now initialized
          setCollectionInitialized(true);
        } catch (error: any) {
          console.error('Failed to add item to Appwrite watchlist:', error);
          
          // Even if cloud sync fails, we keep the local item
        }
      }
    }
  };

  // Remove an item from watchlist
  const removeFromWatchlist = async (id: string) => {
    const itemToRemove = watchlist.find(item => item.id === id);
    if (!itemToRemove) return;
    
    // Update local state first for UI responsiveness
    const updatedWatchlist = watchlist.filter(item => item.id !== id);
    setWatchlist(updatedWatchlist);
    
    // Update local storage
    await saveLocalWatchlist(updatedWatchlist);
    
    // Then remove from Appwrite if authenticated and document ID exists
    if (userId && itemToRemove.documentId) {
      try {
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_WATCHLIST_COLLECTION_ID,
          itemToRemove.documentId
        );
      } catch (error) {
        console.error('Failed to remove item from Appwrite watchlist:', error);
        // Even if cloud deletion fails, we keep the local state updated
      }
    }
  };

  // Sort watchlist by recency or name
  const sortWatchlist = (by: 'recent' | 'name') => {
    const sortedWatchlist = [...watchlist];
    if (by === 'recent') {
      sortedWatchlist.sort((a, b) => b.dateAdded - a.dateAdded);
    } else {
      sortedWatchlist.sort((a, b) => a.englishName.localeCompare(b.englishName));
    }
    setWatchlist(sortedWatchlist);
  };

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
        syncWatchlist,
        isAuthenticated
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

// Custom hook to use the watchlist context
export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};