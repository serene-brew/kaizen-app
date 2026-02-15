/**
 * SyncManager Component – LOCAL-FIRST ARCHITECTURE
 *
 * Orchestrates data synchronization between local storage and Appwrite cloud.
 *
 * Responsibilities:
 *   1. On first login (no local data): bootstrap from cloud
 *   2. On subsequent logins: load from local storage (fast, no network)
 *   3. Automatic daily sync: push local changes → cloud, pull cloud → local
 *   4. After any sync, reload all contexts from local storage (no extra cloud calls)
 *   5. Deduplication happens in SyncEngine during sync, not on startup
 *
 * NO direct Appwrite database calls here — delegated to SyncEngine.
 */

import React, { useEffect, useRef } from 'react';
import { useGlobalContext } from './GlobalProvider';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';
import { useReadHistory } from '../contexts/ReadHistoryContext';
import { useReadlist } from '../contexts/ReadlistContext';
import syncEngine from '../lib/syncEngine';

export const SyncManager: React.FC = () => {
  const { isLogged, user } = useGlobalContext();

  // reloadFromLocal – re-reads AsyncStorage into React state WITHOUT
  // triggering any additional cloud sync.
  const { reloadFromLocal: reloadWatchlist } = useWatchlist();
  const { reloadFromLocal: reloadWatchHistory } = useWatchHistory();
  const { reloadFromLocal: reloadReadHistory } = useReadHistory();
  const { reloadFromLocal: reloadReadlist } = useReadlist();

  const syncAttempted = useRef(false);
  const syncInProgress = useRef(false);

  /**
   * Reload every context from local storage (no cloud calls).
   * Called after bootstrapFromCloud or performFullSync so that
   * React state reflects whatever SyncEngine wrote to AsyncStorage.
   */
  const reloadAllContexts = async () => {
    console.log('[SyncManager] Reloading all contexts from local storage...');
    await Promise.all([
      reloadWatchlist(),
      reloadWatchHistory(),
      reloadReadHistory(),
      reloadReadlist(),
    ]);
    console.log('[SyncManager] All contexts reloaded');
  };

  /**
   * Main sync orchestration.
   *
   * 1) Bootstrap from cloud if local storage is empty (first login / new device)
   * 2) Check if auto-sync is due (24 h since last sync)
   * 3) If so, run full bidirectional sync
   * 4) Reload all contexts from local storage
   */
  const syncData = async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;

    try {
      console.log('[SyncManager] Starting sync orchestration...');

      // Step 1: Bootstrap if needed (first login on this device)
      const bootstrapped = await syncEngine.bootstrapFromCloud();

      // Step 2: Check if daily sync is due
      const shouldSync = await syncEngine.shouldAutoSync();

      if (shouldSync) {
        console.log('[SyncManager] Daily auto-sync is due, running full sync...');
        const result = await syncEngine.performFullSync();
        const successCount = result.results.filter(r => r.success).length;
        console.log(`[SyncManager] Full sync complete: ${successCount}/${result.results.length} collections synced`);
      } else {
        console.log('[SyncManager] Auto-sync not due yet, using local data');
      }

      // Step 3: Reload contexts from local storage so React state is fresh.
      // This does NOT make any cloud calls.
      await reloadAllContexts();

      syncAttempted.current = true;
    } catch (error) {
      console.error('[SyncManager] Sync error:', error);
    } finally {
      syncInProgress.current = false;
    }
  };

  // ── On mount: sync if user is authenticated ─────────────────────────
  useEffect(() => {
    if (isLogged && user && !syncAttempted.current) {
      console.log('[SyncManager] User authenticated on mount, initiating sync');
      // Small delay to let contexts initialize first
      setTimeout(syncData, 500);
    }
  }, []);

  // ── On auth state change ────────────────────────────────────────────
  useEffect(() => {
    if (!isLogged) {
      console.log('[SyncManager] User logged out, resetting sync state');
      syncAttempted.current = false;
      return;
    }

    if (isLogged && user && !syncAttempted.current && !syncInProgress.current) {
      console.log('[SyncManager] Auth state changed to logged in, initiating sync');
      setTimeout(syncData, 300);
    }
  }, [isLogged, user]);

  // Headless component
  return null;
};

export default SyncManager;
