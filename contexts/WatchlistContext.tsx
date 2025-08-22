// React hooks for state management, context creation, and component lifecycle
import React, { createContext, useState, useContext, useEffect } from 'react';

// Appwrite services for cloud database operations and authentication
import { account, databases } from '../lib/appwrite'; // Import Appwrite services

// Appwrite utilities for queries, permissions, and unique ID generation
import { ID, Permission, Role, Query } from 'appwrite'; // Import Appwrite helper methods

// Expo constants for accessing environment configuration
import Constants from 'expo-constants'; // Import Constants for environment variables

// Custom alert system for consistent UI
import { showErrorAlert } from '../components/CustomAlert';

/**
 * Environment Configuration
 * 
 * Retrieves Appwrite database and collection identifiers from environment variables.
 * These are configured in app.config.ts and loaded through Expo Constants.
 * Validates that required configuration is available before proceeding.
 */
// Get database and collection IDs from expo constants
const APPWRITE_DATABASE_ID = Constants.expoConfig?.extra?.appwriteDatabaseId;
const APPWRITE_WATCHLIST_COLLECTION_ID = Constants.expoConfig?.extra?.appwriteWatchlistCollectionId;

// Check if configuration is available - fail fast if misconfigured
if (!APPWRITE_DATABASE_ID || !APPWRITE_WATCHLIST_COLLECTION_ID) {
  throw new Error('Missing Appwrite database configuration (Database ID or Watchlist Collection ID).');
}

/**
 * WatchlistItem Interface
 * 
 * Comprehensive data structure for tracking user's anime watchlist:
 * - Basic metadata (anime ID, name, thumbnail for UI display)
 * - Tracking information (date added for chronological sorting)
 * - Cloud synchronization (document ID for Appwrite operations)
 * 
 * Used for:
 * - Displaying saved anime in user's watchlist
 * - Quick access to anime details and playback
 * - Cross-device synchronization of saved anime
 * - Personalized content recommendations based on saved shows
 */
// Define the structure of watchlist items
export interface WatchlistItem {
  id: string;              // Anime ID - unique identifier for the anime
  englishName: string;     // Anime name - display name for UI components
  thumbnailUrl: string;    // Thumbnail URL - anime poster/thumbnail for visual display
  dateAdded: number;       // Timestamp when added - for chronological sorting
  documentId?: string;     // Appwrite document ID - for cloud storage operations
}

/**
 * WatchlistContext Interface
 * 
 * Complete API for watchlist management functionality:
 * - State tracking (watchlist items, loading states)
 * - CRUD operations (add, remove, toggle watchlist status)
 * - Query helpers (check if anime is saved)
 * - Sorting functionality (by date or name)
 * - Cloud synchronization (refresh from Appwrite)
 * - Authentication integration (user state monitoring)
 */
interface WatchlistContextType {
  watchlist: WatchlistItem[];                          // Current watchlist items
  isInWatchlist: (id: string) => boolean;              // Check if anime is saved
  toggleWatchlist: (id: string, name: string | undefined, thumbnailUrl: string | undefined) => Promise<void>; // Add/remove from watchlist
  removeFromWatchlist: (id: string) => Promise<void>;  // Remove specific anime from watchlist
  sortWatchlist: (by: 'recent' | 'name') => void;      // Sort watchlist by criteria
  isLoading: boolean;                                  // Loading state for UI feedback
  isSyncing: boolean;                                  // Syncing state for cloud operations
  refreshWatchlist: () => Promise<void>;               // Refresh from cloud storage
  isAuthenticated: boolean;                            // Authentication status for conditional features
}

// Create the context
const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

/**
 * WatchlistProvider Component
 * 
 * Comprehensive watchlist management provider that handles:
 * - Cloud-first watchlist storage with Appwrite backend
 * - Real-time synchronization across multiple devices
 * - Optimistic UI updates for better user experience
 * - Cursor-based pagination for efficient data loading
 * - Authentication state monitoring and automatic refresh
 * - Granular user permissions for data security
 * - Graceful error handling with user feedback
 * 
 * Architecture Features:
 * - Cloud-native storage eliminates local/cloud sync conflicts
 * - Pagination handles large watchlists efficiently
 * - Optimistic updates provide immediate UI feedback
 * - Automatic rollback on cloud operation failures
 * - User-specific data isolation with Appwrite permissions
 */
export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core watchlist state management
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);      // All watchlist items
  const [isLoading, setIsLoading] = useState<boolean>(true);           // Loading state for UI feedback
  const [isSyncing, setIsSyncing] = useState<boolean>(false);          // Syncing state for cloud operations
  const [userId, setUserId] = useState<string | null>(null);           // Current authenticated user ID
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Authentication status

  /**
   * Authentication Status Check Effect
   * 
   * Monitors user authentication state on component mount and:
   * - Retrieves current user session from Appwrite
   * - Updates authentication state and user ID
   * - Handles unauthenticated state gracefully
   * - Sets initial loading state appropriately
   * 
   * This effect runs once on mount to establish initial auth state.
   */
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

  /**
   * Cloud Watchlist Fetching Function
   * 
   * Efficiently retrieves watchlist from Appwrite using cursor-based pagination:
   * - Handles large datasets without memory issues
   * - Fetches 100 items per request for optimal performance
   * - Uses cursor pagination to avoid offset limitations
   * - Maps Appwrite documents to local data structure
   * - Handles errors gracefully and returns empty array on failure
   * 
   * @returns Promise<WatchlistItem[]> - Array of watchlist items
   */
  // Function to fetch watchlist from Appwrite
  const fetchCloudWatchlist = async (): Promise<WatchlistItem[]> => {
    if (!userId) return [];
    
    try {
      let allResults: WatchlistItem[] = [];
      let lastId: string | null = null;
      const pageLimit = 100; // Fetch more items per request for efficiency
      
      // Use cursor-based pagination to fetch all documents
      while (true) {
        // Build the query with user filter and pagination
        const queries = [
          Query.equal('userId', userId),    // Only fetch current user's data
          Query.limit(pageLimit)            // Set page size for better performance
        ];
        
        // Add cursor pagination if we have a last ID from previous page
        if (lastId) {
          queries.push(Query.cursorAfter(lastId));
        }
        
        console.log(`Fetching watchlist page${lastId ? ' after ' + lastId : ''}`);
        
        // Fetch the documents from Appwrite
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_WATCHLIST_COLLECTION_ID,
          queries
        );
        
        // If no documents returned, we've reached the end
        if (response.documents.length === 0) {
          break;
        }
        
        // Map Appwrite documents to our local data structure
        const batchResults: WatchlistItem[] = response.documents.map(doc => ({
          id: doc.animeId,                   // Map animeId field to id
          englishName: doc.englishName,
          thumbnailUrl: doc.thumbnailUrl,
          dateAdded: doc.dateAdded,
          documentId: doc.$id                // Store Appwrite document ID for updates
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

  /**
   * Cloud Watchlist Loading Effect
   * 
   * Loads watchlist from cloud storage when user authentication changes:
   * - Triggers when userId changes (login/logout)
   * - Skips loading for unauthenticated users
   * - Fetches complete watchlist using pagination
   * - Updates local state with cloud data
   * - Manages loading states for UI feedback
   */
  // Load watchlist from Appwrite when authenticated
  useEffect(() => {
    const loadCloudWatchlist = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Get cloud watchlist using pagination
        const cloudItems = await fetchCloudWatchlist();
        
        // Update state with fetched watchlist
        setWatchlist(cloudItems);
      } catch (error) {
        console.error('Error loading watchlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCloudWatchlist();
  }, [userId]); // Re-run when user authentication state changes

  /**
   * Watchlist Refresh Function
   * 
   * Public function for manual watchlist refresh with authentication re-validation:
   * - Re-checks authentication status with Appwrite for accuracy
   * - Updates user ID if session has changed
   * - Clears watchlist for unauthenticated users
   * - Fetches fresh data from cloud for authenticated users
   * - Provides comprehensive logging for debugging
   * - Manages loading states throughout the process
   */
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
        
        // Update state with fresh cloud data
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

  /**
   * Watchlist Check Function
   * 
   * Quick lookup to determine if an anime is in the user's watchlist.
   * Used for UI state management (heart icons, button states, etc.).
   * 
   * @param id - Anime ID to check
   * @returns boolean - Whether the anime is in the watchlist
   */
  // Check if an item is in the watchlist
  const isInWatchlist = (id: string) => {
    return watchlist.some(item => item.id === id);
  };

  /**
   * Watchlist Toggle Function
   * 
   * Adds or removes anime from watchlist with optimistic UI updates:
   * - Checks current watchlist status and toggles appropriately
   * - Requires authentication with user-friendly error messages
   * - Implements optimistic UI updates for immediate feedback
   * - Creates Appwrite documents with user-specific permissions
   * - Handles cloud sync failures with automatic rollback
   * - Updates local state with cloud document IDs for future operations
   * 
   * @param id - Anime ID to toggle
   * @param name - Anime name for display (optional)
   * @param thumbnailUrl - Anime thumbnail for display (optional)
   */
  // Add or remove an item from watchlist
  const toggleWatchlist = async (id: string, name: string | undefined, thumbnailUrl: string | undefined) => {
    if (isInWatchlist(id)) {
      await removeFromWatchlist(id);
    } else {
      // If user is not authenticated, show alert
      if (!userId) {
        showErrorAlert("Authentication Required", "Please log in to add items to your watchlist.");
        return;
      }
      
      // Create new item with current timestamp
      const newItem: WatchlistItem = {
        id,
        englishName: name || 'Unknown Anime',
        thumbnailUrl: thumbnailUrl || '',
        dateAdded: Date.now()
      };
      
      // Add to local state first for immediate UI responsiveness (optimistic update)
      const updatedWatchlist = [...watchlist, newItem];
      setWatchlist(updatedWatchlist);
      
      // Sync with Appwrite cloud storage
      try {
        const response = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_WATCHLIST_COLLECTION_ID,
          ID.unique(),                      // Generate unique document ID
          {
            userId: userId,                 // Associate with current user
            animeId: id,
            englishName: name || 'Unknown Anime',
            thumbnailUrl: thumbnailUrl || '',
            dateAdded: Date.now()
          },
          // Add user-specific permissions for data security
          [
            Permission.read(Role.user(userId)),      // User can read their own data
            Permission.update(Role.user(userId)),    // User can update their own data
            Permission.delete(Role.user(userId))     // User can delete their own data
          ]
        );
        
        // Update the item with document ID for future operations
        setWatchlist(prev => 
          prev.map(item => 
            item.id === id ? { ...item, documentId: response.$id } : item
          )
        );
      } catch (error: any) {
        console.error('Failed to add item to Appwrite watchlist:', error);
        
        // If cloud sync fails, rollback the optimistic update
        setWatchlist(prev => prev.filter(item => item.id !== id));
        showErrorAlert("Failed to Add", "Could not add the item to your watchlist.");
      }
    }
  };

  /**
   * Remove from Watchlist Function
   * 
   * Removes anime from watchlist with optimistic UI updates:
   * - Implements optimistic removal for immediate UI feedback
   * - Deletes corresponding Appwrite document if available
   * - Handles cloud deletion failures with automatic restoration
   * - Provides user feedback for operation status
   * - Manages both local state and cloud storage consistently
   * 
   * @param id - Anime ID to remove from watchlist
   */
  // Remove an item from watchlist
  const removeFromWatchlist = async (id: string) => {
    const itemToRemove = watchlist.find(item => item.id === id);
    if (!itemToRemove) return;
    
    // Update local state first for immediate UI responsiveness (optimistic update)
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
        // If deletion fails, restore the item (rollback optimistic update)
        setWatchlist(prev => [...prev, itemToRemove]);
        showErrorAlert("Failed to Remove", "Could not remove the item from your watchlist.");
      }
    }
  };

  /**
   * Watchlist Sorting Function
   * 
   * Sorts watchlist by user preference for better organization:
   * - Recent: Sorts by dateAdded in descending order (newest first)
   * - Name: Sorts alphabetically by anime name for easy browsing
   * - Updates local state immediately for responsive UI
   * - Does not require cloud sync as it's a view-only operation
   * 
   * @param by - Sort criteria ('recent' or 'name')
   */
  // Sort watchlist by recency or name
  const sortWatchlist = (by: 'recent' | 'name') => {
    const sortedWatchlist = [...watchlist];
    if (by === 'recent') {
      sortedWatchlist.sort((a, b) => b.dateAdded - a.dateAdded);  // Newest first
    } else {
      sortedWatchlist.sort((a, b) => a.englishName.localeCompare(b.englishName)); // Alphabetical
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

/**
 * useWatchlist Hook
 * 
 * Custom hook to access the watchlist context with error handling.
 * Ensures the hook is only used within the WatchlistProvider scope.
 * 
 * @returns WatchlistContextType - The complete watchlist context
 * @throws Error if used outside of WatchlistProvider
 */
// Custom hook to use the watchlist context
export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};