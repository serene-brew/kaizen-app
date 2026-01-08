/**
 * Image Cache Management Service
 * 
 * Provides utilities for managing app cache to prevent storage bloat.
 * Works with React Native/Expo's cache system on mobile devices.
 * 
 * Features:
 * - Clear entire app cache directory
 * - Selective cache cleanup (preserve downloads)
 * - Track cache size
 * - Automatic cleanup based on age and size
 * 
 * Note: On mobile, expo-image and other cached data is stored in
 * FileSystem.cacheDirectory which is managed by the OS.
 */

import * as FileSystem from 'expo-file-system';

const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE_MB = 300; // 300MB limit

/**
 * Get total cache directory size
 * 
 * @returns Promise<{ exists: boolean; size: number; fileCount: number }>
 */
export const getCacheInfo = async (): Promise<{ exists: boolean; size: number; fileCount: number }> => {
  try {
    if (!FileSystem.cacheDirectory) {
      console.warn('[ImageCache] Cache directory not available');
      return { exists: false, size: 0, fileCount: 0 };
    }

    const info = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
    
    if (!info.exists) {
      console.warn('[ImageCache] Cache directory does not exist');
      return { exists: false, size: 0, fileCount: 0 };
    }

    // Recursively calculate cache size
    const totalSize = await calculateDirectorySize(FileSystem.cacheDirectory);
    const fileCount = await countFiles(FileSystem.cacheDirectory);

    console.log(`[ImageCache] Cache info: ${fileCount} files, ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    return {
      exists: true,
      size: totalSize,
      fileCount,
    };
  } catch (error) {
    console.error('[ImageCache] Error getting cache info:', error);
    return { exists: false, size: 0, fileCount: 0 };
  }
};

/**
 * Calculate total size of a directory recursively
 */
const calculateDirectorySize = async (dirPath: string): Promise<number> => {
  try {
    const items = await FileSystem.readDirectoryAsync(dirPath);
    let totalSize = 0;

    for (const item of items) {
      const itemPath = `${dirPath}${item}`;
      const info = await FileSystem.getInfoAsync(itemPath);
      
      if (info.exists) {
        if (info.isDirectory) {
          // Recursively get size of subdirectory
          totalSize += await calculateDirectorySize(`${itemPath}/`);
        } else if (info.size) {
          totalSize += info.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.warn('[ImageCache] Error calculating directory size:', error);
    return 0;
  }
};

/**
 * Count files in directory recursively
 */
const countFiles = async (dirPath: string): Promise<number> => {
  try {
    const items = await FileSystem.readDirectoryAsync(dirPath);
    let count = 0;

    for (const item of items) {
      const itemPath = `${dirPath}${item}`;
      const info = await FileSystem.getInfoAsync(itemPath);
      
      if (info.exists) {
        if (info.isDirectory) {
          count += await countFiles(`${itemPath}/`);
        } else {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    return 0;
  }
};

/**
 * Clear all app cache except downloads
 * 
 * Clears the entire cache directory but preserves the Downloads folder
 * to keep user's downloaded episodes.
 * 
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const clearAllImageCache = async (): Promise<boolean> => {
  try {
    if (!FileSystem.cacheDirectory) {
      console.warn('[ImageCache] Cache directory not available');
      return false;
    }

    console.log('[ImageCache] Clearing app cache...');
    
    const items = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    let deletedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      // Skip Downloads directory to preserve user's downloaded content
      if (item === 'Downloads' || item.startsWith('Download')) {
        console.log(`[ImageCache] Skipping ${item} directory`);
        continue;
      }

      try {
        const itemPath = `${FileSystem.cacheDirectory}${item}`;
        await FileSystem.deleteAsync(itemPath, { idempotent: true });
        deletedCount++;
      } catch (deleteError) {
        console.warn(`[ImageCache] Failed to delete ${item}:`, deleteError);
        failedCount++;
      }
    }

    console.log(`[ImageCache] Cache cleared: ${deletedCount} items deleted, ${failedCount} failed`);
    return failedCount === 0;
  } catch (error) {
    console.error('[ImageCache] Failed to clear cache:', error);
    return false;
  }
};

/**
 * Clear old cached files
 * 
 * Removes files older than MAX_CACHE_AGE_MS from cache directory
 * 
 * @returns Promise<number> - Number of files deleted
 */
export const clearOldCache = async (): Promise<number> => {
  try {
    if (!FileSystem.cacheDirectory) {
      return 0;
    }

    const now = Date.now();
    let deletedCount = 0;

    const deleteOldItems = async (dirPath: string): Promise<void> => {
      try {
        const items = await FileSystem.readDirectoryAsync(dirPath);

        for (const item of items) {
          // Skip Downloads directory
          if (item === 'Downloads' || item.startsWith('Download')) {
            continue;
          }

          const itemPath = `${dirPath}${item}`;
          const info = await FileSystem.getInfoAsync(itemPath);

          if (!info.exists) continue;

          if (info.isDirectory) {
            // Recursively check subdirectory
            await deleteOldItems(`${itemPath}/`);
          } else if (info.modificationTime) {
            const fileAge = now - info.modificationTime * 1000;
            
            if (fileAge > MAX_CACHE_AGE_MS) {
              try {
                await FileSystem.deleteAsync(itemPath, { idempotent: true });
                deletedCount++;
              } catch (deleteError) {
                console.warn(`[ImageCache] Failed to delete old file:`, deleteError);
              }
            }
          }
        }
      } catch (error) {
        console.warn('[ImageCache] Error reading directory:', error);
      }
    };

    await deleteOldItems(FileSystem.cacheDirectory);

    if (deletedCount > 0) {
      console.log(`[ImageCache] Deleted ${deletedCount} old cache files`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[ImageCache] Error clearing old cache:', error);
    return 0;
  }
};

/**
 * Clear cache if size exceeds limit
 * 
 * Checks total cache size and clears it if it exceeds MAX_CACHE_SIZE_MB
 * 
 * @returns Promise<boolean> - true if cache was cleared, false otherwise
 */
export const clearCacheIfExceedsLimit = async (): Promise<boolean> => {
  try {
    const cacheInfo = await getCacheInfo();
    
    if (!cacheInfo.exists) {
      return false;
    }

    const sizeMB = cacheInfo.size / 1024 / 1024;
    
    console.log(`[ImageCache] Current cache size: ${sizeMB.toFixed(2)}MB (limit: ${MAX_CACHE_SIZE_MB}MB)`);
    
    if (sizeMB > MAX_CACHE_SIZE_MB) {
      console.log(`[ImageCache] Cache size exceeds limit, clearing...`);
      return await clearAllImageCache();
    }

    return false;
  } catch (error) {
    console.error('[ImageCache] Error checking cache size:', error);
    return false;
  }
};

/**
 * Perform smart cache cleanup
 * 
 * Combines multiple cleanup strategies:
 * 1. Clear files older than 24 hours
 * 2. Clear all cache if total size exceeds limit
 * 
 * Call this when reading manga chapters or periodically
 * 
 * @returns Promise<{ oldFilesDeleted: number; fullClearPerformed: boolean }>
 */
export const smartCacheCleanup = async (): Promise<{ oldFilesDeleted: number; fullClearPerformed: boolean }> => {
  console.log('[ImageCache] Starting smart cache cleanup...');
  
  try {
    // Get initial cache info
    const initialInfo = await getCacheInfo();
    console.log(`[ImageCache] Initial cache: ${(initialInfo.size / 1024 / 1024).toFixed(2)}MB, ${initialInfo.fileCount} files`);

    // First, try to delete old files
    const oldFilesDeleted = await clearOldCache();
    
    // Then check if size still exceeds limit
    const fullClearPerformed = await clearCacheIfExceedsLimit();
    
    // Get final cache info
    const finalInfo = await getCacheInfo();
    const finalSizeMB = finalInfo.exists ? (finalInfo.size / 1024 / 1024).toFixed(2) : '0';
    
    console.log(`[ImageCache] Cleanup complete: ${oldFilesDeleted} old files deleted, full clear: ${fullClearPerformed}, final size: ${finalSizeMB}MB`);
    
    return {
      oldFilesDeleted,
      fullClearPerformed,
    };
  } catch (error) {
    console.error('[ImageCache] Error during smart cleanup:', error);
    return {
      oldFilesDeleted: 0,
      fullClearPerformed: false,
    };
  }
};

export default {
  getCacheInfo,
  clearAllImageCache,
  clearOldCache,
  clearCacheIfExceedsLimit,
  smartCacheCleanup,
};
