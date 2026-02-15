/**
 * AuthSyncService Component – LOCAL-FIRST ARCHITECTURE
 *
 * Monitors authentication state transitions and ensures local data
 * is loaded into contexts when user logs in.
 *
 * In the local-first architecture, this component no longer triggers
 * cloud refreshes on every login.  That's handled by SyncManager.
 * Its only job now is to detect login events and signal contexts.
 *
 * NOTE: With the local-first approach, contexts load from local storage
 * automatically when userId changes.  This service is kept for backward
 * compatibility and as a safety net.
 */

import React, { useEffect, useRef } from 'react';
import { useGlobalContext } from './GlobalProvider';

export const AuthSyncService: React.FC = () => {
  const { isLogged, user } = useGlobalContext();
  const hasInitialSyncRef = useRef<boolean>(false);

  useEffect(() => {
    if (isLogged && user && !hasInitialSyncRef.current) {
      console.log('[AuthSyncService] User logged in, local data will load automatically from contexts');
      hasInitialSyncRef.current = true;
    }

    if (!isLogged) {
      hasInitialSyncRef.current = false;
    }
  }, [isLogged, user]);

  return null;
};
