import React, { createContext, useState, useContext, useEffect } from 'react';
import { account, databases } from '../lib/appwrite'; // Import Appwrite services
import { ID, Permission, Role, Query } from 'appwrite'; // Import Appwrite helper methods
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
  documentId?: string; // Appwrite document ID
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
  isAuthenticated: boolean;
}

// Create the context
const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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

  // Function to fetch watchlist from Appwrite
  const fetchCloudWatchlist = async (): Promise<WatchlistItem[]> => {
    if (!userId) return [];
    
    try {
      let allResults: WatchlistItem[] = [];
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
        
        console.log(`Fetching watchlist page${lastId ? ' after ' + lastId : ''}`);
        
        // Fetch the documents
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_WATCHLIST_COLLECTION_ID,
          queries
        );
        
        // If no documents returned, break the loop
        if (response.documents.length === 0) {
          break;
        }
        
        // Map to our watchlist item format
        const batchResults: WatchlistItem[] = response.documents.map(doc => ({
          id: doc.animeId,
          englishName: doc.englishName,
          thumbnailUrl: doc.thumbnailUrl,
          dateAdded: doc.dateAdded,
          documentId: doc.$id
        }));
        
        // Add the current batch to our results
        allResults = [...allResults, ...batchResults];
        
        // If we got fewer documents than the limit, we've reached the end
        if (response.documents.length < pageLimit) {
          break;
        }
        
        // Update the cursor for the next page
        lastId = response.documents[response.documents.length - 1].$id;
      }
      
      console.log(`Fetched ${allResults.length} total watchlist items with pagination`);
      return allResults;
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
        
        // Update state
        setWatchlist(cloudItems);
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
      console.log("Refreshing watchlist data...");
      
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
        console.log("Not authenticated in refreshWatchlist:", err);
        setIsAuthenticated(false);
        setUserId(null);
        
        // If not authenticated, clear watchlist
        setWatchlist([]);
        return;
      }
      
      // If user is authenticated, fetch from Appwrite
      if (userId) {
        console.log(`User authenticated (${userId}), fetching cloud watchlist...`);
        const cloudItems = await fetchCloudWatchlist();
        console.log(`Fetched ${cloudItems.length} items from cloud watchlist`);
        
        // Update state
        setWatchlist(cloudItems);
        console.log("Watchlist refresh complete");
      } else {
        // If not authenticated, watchlist should be empty
        setWatchlist([]);
        console.log("User not authenticated, watchlist cleared");
      }
    } catch (error) {
      console.error('Error refreshing watchlist:', error);
    } finally {
      setIsLoading(false);
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
      // If user is not authenticated, show alert
      if (!userId) {
        Alert.alert("Authentication Required", "Please log in to add items to your watchlist.");
        return;
      }
      
      // Create new item
      const newItem: WatchlistItem = {
        id,
        englishName: name || 'Unknown Anime',
        thumbnailUrl: thumbnailUrl || '',
        dateAdded: Date.now()
      };
      
      // Add to local state first for UI responsiveness
      const updatedWatchlist = [...watchlist, newItem];
      setWatchlist(updatedWatchlist);
      
      // Sync with Appwrite
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
      } catch (error: any) {
        console.error('Failed to add item to Appwrite watchlist:', error);
        
        // If cloud sync fails, remove from local state
        setWatchlist(prev => prev.filter(item => item.id !== id));
        Alert.alert("Failed to Add", "Could not add the item to your watchlist.");
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
        // If deletion fails, restore the item
        setWatchlist(prev => [...prev, itemToRemove]);
        Alert.alert("Failed to Remove", "Could not remove the item from your watchlist.");
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