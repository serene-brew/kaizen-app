import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the structure of watchlist items
export interface WatchlistItem {
  id: string;
  englishName: string;
  thumbnailUrl: string;
  dateAdded: number;
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  isInWatchlist: (id: string) => boolean;
  toggleWatchlist: (id: string, name: string | undefined, thumbnailUrl: string | undefined) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;
  sortWatchlist: (by: 'recent' | 'name') => void;
}

// Create the context
const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

// Storage key
const WATCHLIST_STORAGE_KEY = '@kaizen_watchlist';

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Load watchlist from AsyncStorage on component mount
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

  // Save watchlist to AsyncStorage whenever it changes
  useEffect(() => {
    const saveWatchlist = async () => {
      try {
        await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
        // Here you would also sync with Appwrite
        // Example: await updateAppwriteWatchlist(watchlist);
      } catch (error) {
        console.error('Failed to save watchlist to storage:', error);
      }
    };

    saveWatchlist();
  }, [watchlist]);

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
      
      setWatchlist(prev => [...prev, newItem]);
    }
  };

  // Remove an item from watchlist
  const removeFromWatchlist = async (id: string) => {
    const updatedWatchlist = watchlist.filter(item => item.id !== id);
    setWatchlist(updatedWatchlist);
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
        sortWatchlist 
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