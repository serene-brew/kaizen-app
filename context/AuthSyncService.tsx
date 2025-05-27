// React hooks for component lifecycle and reference management
import React, { useEffect, useRef } from 'react';

// Global authentication context for user state monitoring
import { useGlobalContext } from './GlobalProvider';

// Feature-specific contexts for data synchronization
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';

/**
 * AuthSyncService Component
 * 
 * A headless service component that orchestrates data synchronization between
 * local app state and cloud storage based on authentication state changes.
 * 
 * Key Responsibilities:
 * - Monitors authentication state transitions (login/logout)
 * - Triggers one-time data refresh when user successfully logs in
 * - Coordinates parallel synchronization of watchlist and watch history
 * - Prevents duplicate sync operations and race conditions
 * - Provides detailed logging for debugging sync operations
 * - Resets sync state on logout for proper re-initialization
 * 
 * Architecture Benefits:
 * - Centralized sync logic separate from UI components
 * - Automatic data consistency without manual intervention
 * - Performance optimization through parallel API calls
 * - Robust error handling and state management
 * - Clean separation of concerns for authentication workflows
 * 
 * Usage:
 * This component should be rendered once at the app root level to ensure
 * authentication state changes are monitored throughout the app lifecycle.
 */
export const AuthSyncService: React.FC = () => {
  // Extract authentication state from global context
  const { isLogged, user } = useGlobalContext();
  
  // Extract data refresh functions from feature contexts
  const { refreshWatchlist } = useWatchlist();
  const { refreshWatchHistory } = useWatchHistory();
  
  // Ref to track if initial sync has been performed for current session
  // Prevents redundant sync operations during the same authentication session
  const hasInitialSyncRef = useRef<boolean>(false);
  
  // Ref to track if a sync operation is currently in progress
  // Prevents concurrent sync operations that could cause race conditions
  const isSyncingRef = useRef<boolean>(false);

  /**
   * Authentication State Effect
   * 
   * Monitors authentication state changes and triggers data synchronization
   * when a user successfully logs in. Implements several safeguards:
   * 
   * 1. **Concurrency Control**: Prevents multiple simultaneous sync operations
   * 2. **One-Time Sync**: Ensures sync only happens once per login session
   * 3. **Parallel Execution**: Refreshes watchlist and watch history simultaneously
   * 4. **Error Handling**: Gracefully handles sync failures without crashing
   * 5. **State Reset**: Clears sync flags on logout for fresh re-initialization
   * 
   * The effect dependency array includes only isLogged and user to prevent
   * unnecessary re-runs when refresh functions change (they're stable).
   */
  // Listen for authentication state changes and refresh data
  useEffect(() => {
    /**
     * Cloud Data Synchronization Function
     * 
     * Performs the actual data refresh operation with comprehensive safeguards:
     * - Validates authentication state before proceeding
     * - Prevents concurrent sync operations using ref flags
     * - Executes watchlist and watch history refresh in parallel for performance
     * - Provides detailed console logging for debugging and monitoring
     * - Handles errors gracefully and ensures cleanup of sync flags
     */
    const syncDataWithCloud = async () => {
      // Guard clauses to prevent unnecessary or invalid sync operations
      if (isSyncingRef.current || !isLogged || !user) return;
      if (hasInitialSyncRef.current) return;
      
      // Set syncing flag to prevent concurrent sync operations
      isSyncingRef.current = true;
      
      try {
        console.log('AuthSyncService: User logged in, performing one-time data refresh...');
        
        // Execute watchlist and watch history refresh in parallel for optimal performance
        // Using Promise.all ensures both operations complete before proceeding
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
        
        // Mark initial sync as complete to prevent redundant operations
        hasInitialSyncRef.current = true;
      } catch (error) {
        console.error('AuthSyncService: Error refreshing data:', error);
      } finally {
        // Always clear the syncing flag to allow future sync operations
        isSyncingRef.current = false;
      }
    };

    // Execute sync function when authentication state changes
    syncDataWithCloud();
    
    // Reset sync state when user logs out to prepare for next login
    if (!isLogged) {
      hasInitialSyncRef.current = false;
    }
  }, [isLogged, user, refreshWatchlist, refreshWatchHistory]);

  // Headless component - renders nothing but provides essential sync functionality
  return null;
};
