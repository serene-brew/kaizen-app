// filepath: /home/risersama/projects/kaizen-app/contexts/AuthContext.tsx

// React core hooks for state management and component lifecycle
import React, { createContext, useContext, useState, useEffect } from 'react';

// Appwrite authentication service and models
import { account } from '../lib/appwrite';
import { Models } from 'appwrite';

// Feature-specific contexts for data synchronization
import { useWatchlist } from './WatchlistContext';
import { useWatchHistory } from './WatchHistoryContext';

// AsyncStorage for local cache management
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AuthContext Interface
 * 
 * Defines the authentication context contract with:
 * - User profile data and authentication status
 * - Loading states for auth operations
 * - Logout functionality with comprehensive cleanup
 */
interface AuthContextProps {
  user: Models.User<Models.Preferences> | null;    // Current user profile from Appwrite
  isAuthenticated: boolean;                        // Authentication status flag
  loading: boolean;                                // Loading state for auth operations
  handleLogout: () => Promise<void>;               // Logout function with data cleanup
}

// Create the authentication context
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

/**
 * AuthProvider Component
 * 
 * A simplified authentication provider that manages:
 * - User session validation and restoration on app startup
 * - Automatic data synchronization with watchlist and watch history
 * - Comprehensive logout process with cache clearing
 * - Integration with Appwrite authentication backend
 * 
 * Key Features:
 * - Automatic session restoration on app launch
 * - Parallel data refresh after authentication
 * - Complete cache cleanup on logout for privacy
 * - Preserves download files during logout process
 * - Robust error handling for all auth operations
 * 
 * Note: This is a simpler alternative to GlobalProvider,
 * focusing specifically on authentication state management.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core authentication state management
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Access data contexts for synchronization after authentication
  const { refreshWatchlist } = useWatchlist();
  const { refreshWatchHistory } = useWatchHistory();

  /**
   * Initial Authentication Check Effect
   * 
   * Validates existing user sessions on app startup and handles:
   * - Session restoration from stored Appwrite credentials
   * - Automatic data synchronization after successful validation
   * - Error handling for invalid or expired sessions
   * - Loading state management during validation process
   * 
   * The parallel data refresh ensures user data is immediately
   * available after authentication validation.
   */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Attempt to get current authenticated user from Appwrite
        const currentUser = await account.get();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Refresh watchlist and watch history when user logs in
        // Execute in parallel for optimal performance
        await Promise.all([refreshWatchlist(), refreshWatchHistory()]);
      } catch (error) {
        // No valid session found - reset to unauthenticated state
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Always set loading to false regardless of auth status
        setLoading(false);
      }
    };

    fetchUser();
  }, [refreshWatchlist, refreshWatchHistory]);

  /**
   * Logout Handler Function
   * 
   * Comprehensive logout process that includes:
   * - Appwrite session termination
   * - Complete app cache clearing for privacy
   * - Data context refresh to ensure clean state
   * - Robust error handling to ensure logout completion
   * 
   * The cache clearing preserves download files while removing
   * all user-specific data for privacy and security.
   */
  // When user logs out, we should clear watchlist and watch history data
  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // Delete current session from Appwrite
      await account.deleteSession('current');
      setUser(null);

      // Clear search-related caches from AsyncStorage
      await clearSearchCache();

      // Refresh the watchlist and watch history to clear them (since we only use cloud storage now)
      // Execute in parallel for optimal performance
      await Promise.all([refreshWatchlist(), refreshWatchHistory()]);
      
      // Update authentication state
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
      // Handle error gracefully - logout should still complete locally
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cache Clearing Function
   * 
   * Comprehensive cache management for logout and privacy:
   * - Clears all search-related cached data
   * - Removes anime data caches (details, trending, top lists)
   * - Cleans user-specific preferences and settings
   * - Preserves download files for offline viewing
   * - Handles AsyncStorage errors gracefully with fallback clearing
   * - Provides detailed logging for debugging and monitoring
   */
  // Function to clear cache during logout
  const clearSearchCache = async () => {
    console.log('AuthContext: Clearing app cache data...');
    try {
      // Clear search-related caches
      const searchCacheKeys = [
        'search_results_cache',     // Search results from API
        'search_params_cache',      // Search parameters (query, genres)
        'recent_searches'           // User's recent search terms
      ];
      
      // Clear anime data-related caches
      const animeDataCacheKeys = [
        'anime_details_cache',      // Detailed anime information
        'trending_anime_cache',     // Trending anime listings
        'top_anime_cache',          // Top anime listings
        'seasonal_anime_cache',     // Seasonal anime if implemented
        'carousel_anime_cache',     // Featured/carousel anime
        'related_anime_cache'       // Related anime recommendations
      ];
      
      // Clear user-specific data
      const userDataCacheKeys = [
        'user_preferences',         // User preferences/settings
        'last_view_position',       // Saved view positions outside of watch history
        'playback_settings',        // Video player settings if stored separately
        'filter_preferences',       // User's filter preferences for search/browse
        'last_selected_tabs'        // Remember last selected tabs if implemented
      ];
      
      // Get all storage keys for thorough cleaning
      // Note: We exclude the downloads storage key to preserve downloaded files
      try {
        const allStorageKeys = await AsyncStorage.getAllKeys();
        const additionalKeys = allStorageKeys.filter(key => 
          // Keep the downloads key (preserve downloaded files)
          key !== '@kaizen_downloads' && 
          // Filter out keys already in our lists
          !searchCacheKeys.includes(key) && 
          !animeDataCacheKeys.includes(key) && 
          !userDataCacheKeys.includes(key) &&
          // Additional exclusions you might want to add
          !key.includes('download') && // Skip anything download related
          // Add more exclusions if needed
          true
        );
        
        // Combine all cache keys for removal
        const allCacheKeys = [
          ...searchCacheKeys, 
          ...animeDataCacheKeys, 
          ...userDataCacheKeys,
          ...additionalKeys
        ];
        
        console.log(`AuthContext: Clearing ${allCacheKeys.length} app cache items...`);
        await Promise.all(allCacheKeys.map(key => AsyncStorage.removeItem(key)));
        
        console.log('AuthContext: App cache cleared successfully');
      } catch (storageError) {
        console.error('AuthContext: Error accessing all storage keys:', storageError);
        // Fall back to clearing just our known keys
        const fallbackKeys = [...searchCacheKeys, ...animeDataCacheKeys, ...userDataCacheKeys];
        console.log(`AuthContext: Falling back to clearing ${fallbackKeys.length} known cache keys...`);
        await Promise.all(fallbackKeys.map(key => AsyncStorage.removeItem(key)));
      }
    } catch (error) {
      console.error('AuthContext: Error clearing app cache:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 
 * Custom hook to access the authentication context with error handling.
 * Ensures the hook is only used within the AuthProvider scope.
 * 
 * @returns AuthContextProps - The complete authentication context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};