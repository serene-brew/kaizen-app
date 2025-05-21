import React, { useEffect, useRef } from 'react';
import { useGlobalContext } from './GlobalProvider';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';

/**
 * SyncManager is a dedicated component that handles data synchronization between 
 * cloud storage for watchlist and watch history when authentication state changes.
 * This component addresses the issue where data isn't immediately loaded after login.
 */
export const SyncManager: React.FC = () => {
  const { isLogged, user } = useGlobalContext();
  const { refreshWatchlist } = useWatchlist();
  const { refreshWatchHistory } = useWatchHistory();
  
  // Track sync completion status
  const syncAttempted = useRef(false);
  const syncInProgress = useRef(false);
  
  // Function to perform the actual sync
  const syncData = async () => {
    if (syncInProgress.current) return;
    
    try {
      syncInProgress.current = true;
      console.log('SyncManager: Starting data synchronization...');
      
      // First refresh watchlist
      console.log('SyncManager: Refreshing watchlist...');
      await refreshWatchlist();
      console.log('SyncManager: Watchlist refresh complete');
      
      // Then refresh watch history
      console.log('SyncManager: Refreshing watch history...');
      await refreshWatchHistory();
      console.log('SyncManager: Watch history refresh complete');
      
      console.log('SyncManager: All data synchronization complete');
      syncAttempted.current = true;
    } catch (error) {
      console.error('SyncManager: Error synchronizing data:', error);
    } finally {
      syncInProgress.current = false;
    }
  };

  // Monitor authentication state
  // Force a sync when the component mounts if the user is logged in
  useEffect(() => {
    const initialSync = async () => {
      // Check the current authentication state - this will always run once on mount
      if (isLogged && user && !syncAttempted.current) {
        console.log('SyncManager: Initial mount with authenticated user - syncing data');
        
        // Run the sync with a slight delay to ensure all contexts are initialized
        setTimeout(syncData, 500);
      }
    };
    
    initialSync();
  }, []); // Empty dependency array means this runs once on mount

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthStateChange = async () => {
      // Reset sync status when logging out
      if (!isLogged) {
        console.log('SyncManager: User logged out, resetting sync state');
        syncAttempted.current = false;
        return;
      }
      
      // If user logs in and we haven't synced yet
      if (isLogged && user && !syncAttempted.current && !syncInProgress.current) {
        console.log('SyncManager: Auth state changed to logged in, initiating data sync');
        
        // Add a small delay to ensure all contexts are properly initialized
        setTimeout(syncData, 300);
      }
    };

    handleAuthStateChange();
  }, [isLogged, user]);

  // This component doesn't render anything
  return null;
};

export default SyncManager;
