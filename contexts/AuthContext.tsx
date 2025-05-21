import React, { createContext, useContext, useState, useEffect } from 'react';
import { account } from '../lib/appwrite';
import { useWatchlist } from './WatchlistContext';
import { useWatchHistory } from './WatchHistoryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Models } from 'appwrite';

interface AuthContextProps {
  user: Models.User<Models.Preferences> | null;
  isAuthenticated: boolean;
  loading: boolean;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Get refreshWatchlist function from watchlist context
  const { refreshWatchlist } = useWatchlist();
  
  // Get refreshWatchHistory function from watch history context
  const { refreshWatchHistory } = useWatchHistory();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Refresh watchlist and watch history when user logs in
        await Promise.all([refreshWatchlist(), refreshWatchHistory()]);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [refreshWatchlist, refreshWatchHistory]);

  // When user logs out, we should clear watchlist and watch history data
  const handleLogout = async () => {
    try {
      setLoading(true);
      await account.deleteSession('current');
      setUser(null);

      // Clear search-related caches from AsyncStorage
      await clearSearchCache();

      // Refresh the watchlist and watch history to clear them (since we only use cloud storage now)
      await Promise.all([refreshWatchlist(), refreshWatchHistory()]);
      
      // Update isAuthenticated state
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
      // Handle error (e.g., show toast)
    } finally {
      setLoading(false);
    }
  };

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};