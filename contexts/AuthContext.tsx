import React, { createContext, useContext, useState, useEffect } from 'react';
import { account } from '../lib/appwrite';
import { useWatchlist } from './WatchlistContext';

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Refresh watchlist when user logs in
        await refreshWatchlist();
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [refreshWatchlist]);

  // When user logs out, we should also clear Appwrite-specific watchlist data
  const handleLogout = async () => {
    try {
      setLoading(true);
      await account.deleteSession('current');
      setUser(null);

      // We keep AsyncStorage watchlist for offline/guest mode
      // But we will refresh the watchlist to ensure it shows local data only
      await refreshWatchlist();
      
      // Update isAuthenticated state
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
      // Handle error (e.g., show toast)
    } finally {
      setLoading(false);
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