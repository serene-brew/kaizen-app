// React hooks for component lifecycle and reference management
import React, { useEffect, useRef } from 'react';

// Global authentication context for user state monitoring
import { useGlobalContext } from './GlobalProvider';

// Feature-specific contexts for data synchronization
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';
import { useReadHistory } from '../contexts/ReadHistoryContext';

/**
 * SyncManager Component
 * 
 * A dedicated synchronization service that handles automated data refresh
 * between local app state and cloud storage when authentication state changes.
 * 
 * Key Responsibilities:
 * - Monitors authentication state transitions (login/logout/session restoration)
 * - Performs one-time data synchronization after successful authentication
 * - Coordinates parallel refresh of watchlist and watch history data
 * - Prevents duplicate sync operations through ref-based state tracking
 * - Handles both initial app launch sync and runtime auth state changes
 * - Provides comprehensive logging for debugging sync operations
 * 
 * Architecture Benefits:
 * - Dedicated sync logic separate from authentication provider
 * - Automatic data consistency without manual intervention
 * - Performance optimization through parallel API calls
 * - Robust duplicate prevention and error handling
 * - Clean separation of concerns for data synchronization
 * 
 * Usage:
 * This component should be rendered once at the app root level alongside
 * the authentication provider to ensure comprehensive sync coverage.
 * 
 * Note: This component addresses the critical issue where user data isn't
 * immediately available after login, ensuring seamless user experience.
 */
export const SyncManager: React.FC = () => {
  // Extract authentication state from global context
  const { isLogged, user } = useGlobalContext();
  
  // Extract data refresh functions from feature contexts
  const { refreshWatchlist } = useWatchlist();
  const { refreshWatchHistory, cleanupAllUserDuplicates: cleanupWatchDuplicates } = useWatchHistory();
  const { refreshHistory: refreshReadHistory, cleanupAllUserDuplicates: cleanupReadDuplicates } = useReadHistory();
  
  // Ref to track if sync has been attempted for current session
  // Prevents redundant sync operations during the same authentication session
  const syncAttempted = useRef(false);
  
  // Ref to track if a sync operation is currently in progress
  // Prevents concurrent sync operations that could cause race conditions
  const syncInProgress = useRef(false);
  
  // Ref to track if cleanup has been performed
  const cleanupPerformed = useRef(false);
  
  /**
   * Data Synchronization Function
   * 
   * Performs the actual data refresh operation with comprehensive safeguards:
   * - Prevents concurrent sync operations using ref flags
   * - Executes watchlist and watch history refresh in parallel for performance
   * - Provides detailed console logging for debugging and monitoring
   * - Handles errors gracefully without crashing the app
   * - Ensures cleanup of sync flags for future operations
   * - Marks sync as attempted to prevent duplicate operations
   */
  // Function to perform the actual sync
  const syncData = async () => {
    // Guard clause to prevent concurrent sync operations
    if (syncInProgress.current) return;
    
    try {
      // Set sync flag to true
      syncInProgress.current = true;

      // Run watchlist, watch history, and read history refresh in parallel for optimal performance
      // Using Promise.all ensures all operations complete before proceeding
      console.log('SyncManager: Refreshing watchlist, watch history, and read history in parallel...');
      await Promise.all([
        refreshWatchlist().then(() => {
          console.log('SyncManager: Watchlist refresh complete');
        }),
        refreshWatchHistory().then(() => {
          console.log('SyncManager: Watch history refresh complete');
        }),
        refreshReadHistory().then(() => {
          console.log('SyncManager: Read history refresh complete');
        })
      ]);
      console.log('SyncManager: All data refresh complete');
      
      // Perform duplicate cleanup once after initial sync
      if (!cleanupPerformed.current) {
        console.log('SyncManager: Starting duplicate cleanup for watch and read history...');
        await Promise.all([
          cleanupWatchDuplicates().then(() => {
            console.log('SyncManager: Watch history duplicate cleanup complete');
          }),
          cleanupReadDuplicates().then(() => {
            console.log('SyncManager: Read history duplicate cleanup complete');
          })
        ]);
        cleanupPerformed.current = true;
        console.log('SyncManager: All duplicate cleanup complete');
      }
      
      console.log('SyncManager: All data synchronization complete');
      
      // Mark sync as attempted to prevent redundant operations
      syncAttempted.current = true;
    } catch (error) {
      console.error('SyncManager: Error synchronizing data:', error);
    } finally {
      // Always clear the sync flag to allow future sync operations
      syncInProgress.current = false;
    }
  };

  /**
   * Initial Mount Sync Effect
   * 
   * Handles data synchronization when the component first mounts.
   * This is critical for scenarios where:
   * - User is already authenticated when app launches
   * - Session is restored from stored credentials
   * - App is reopened with valid authentication state
   * 
   * Uses a slight delay to ensure all contexts are properly initialized
   * before attempting data synchronization.
   */
  // Monitor authentication state
  // Force a sync when the component mounts if the user is logged in
  useEffect(() => {
    const initialSync = async () => {
      // Check the current authentication state - this will always run once on mount
      if (isLogged && user && !syncAttempted.current) {
        console.log('SyncManager: Initial mount with authenticated user - syncing data');
        
        // Run the sync with a slight delay to ensure all contexts are initialized
        // This prevents potential race conditions with context initialization
        setTimeout(syncData, 500);
      }
    };
    
    initialSync();
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Authentication State Change Effect
   * 
   * Monitors runtime changes in authentication state and responds appropriately:
   * 
   * **Login Events:**
   * - Detects when user successfully authenticates
   * - TcleanupPerformed.current = false;
        riggers data synchronization if not already performed
   * - Uses delay to ensure context initialization
   * 
   * **Logout Events:**
   * - Resets sync state flags for clean re-initialization
   * - Prepares for next authentication session
   * 
   * **Race Condition Prevention:**
   * - Checks sync status before initiating new operations
   * - Prevents duplicate sync calls during state transitions
   */
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
        // This prevents potential issues with context dependencies
        setTimeout(syncData, 300);
      }
    };

    handleAuthStateChange();
  }, [isLogged, user]); // Dependencies: authentication state and user data

  // Headless component - renders nothing but provides essential sync functionality
  return null;
};

export default SyncManager;
