import React, { useEffect, useRef } from 'react';
import { useGlobalContext } from './GlobalProvider';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';

/**
 * This component acts as a sync service that listens for authentication state changes
 * and refreshes watchlist and watch history data accordingly.
 */
export const AuthSyncService: React.FC = () => {
  const { isLogged, user } = useGlobalContext();
  const { refreshWatchlist } = useWatchlist();
  const { refreshWatchHistory } = useWatchHistory();
  
  // Use a ref to track if initial sync has been performed
  const hasInitialSyncRef = useRef<boolean>(false);
  // Use a ref to track if a sync is currently in progress
  const isSyncingRef = useRef<boolean>(false);

  // Listen for authentication state changes and refresh data
  useEffect(() => {
    const syncDataWithCloud = async () => {
      // Prevent concurrent syncs and avoid unnecessary syncs
      if (isSyncingRef.current || !isLogged || !user) return;
      if (hasInitialSyncRef.current) return;
      
      // Set syncing flag to prevent re-entry
      isSyncingRef.current = true;
      
      try {
        console.log('AuthSyncService: User logged in, performing one-time data refresh...');
        
        // Refresh watchlist and watch history in parallel for better performance
        console.log('AuthSyncService: Refreshing watchlist and watch history in parallel...');
        await Promise.all([
          refreshWatchlist().then(() => {
            console.log('AuthSyncService: Watchlist refresh complete');
          }),
          refreshWatchHistory().then(() => {
            console.log('AuthSyncService: Watch history refresh complete');
          })
        ]);
        console.log('AuthSyncService: Both watchlist and watch history refresh complete');
        
        console.log('AuthSyncService: All data refresh complete');
        
        // Mark initial sync as complete
        hasInitialSyncRef.current = true;
      } catch (error) {
        console.error('AuthSyncService: Error refreshing data:', error);
      } finally {
        // Always clear the syncing flag when done
        isSyncingRef.current = false;
      }
    };

    // Execute sync function when auth state changes
    syncDataWithCloud();
    
    // Reset the flag when user logs out
    if (!isLogged) {
      hasInitialSyncRef.current = false;
    }
  }, [isLogged, user]);  // Remove function dependencies to prevent re-running

  // This is a headless component that doesn't render anything
  return null;
};
