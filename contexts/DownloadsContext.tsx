// React hooks for state management, context creation, and component lifecycle
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

// AsyncStorage for persistent download data storage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo file system utilities for download management and file operations
import * as FileSystem from 'expo-file-system';

// Expo media library for saving downloads to device gallery
import * as MediaLibrary from 'expo-media-library';

// React Native core components for platform detection
import { Platform } from 'react-native';

// Expo notifications for download progress and completion alerts
import * as Notifications from 'expo-notifications';

// Custom alert system for consistent UI
import { showCustomAlert } from '../components/CustomAlert';

/**
 * Constants and Interfaces
 * 
 * Core data structures and storage keys for the download management system.
 */
// Storage key for downloads - using @ prefix for namespacing
const DOWNLOADS_STORAGE_KEY = '@kaizen_downloads';

/**
 * DownloadItem Interface
 * 
 * Comprehensive data structure for tracking individual download operations:
 * - Basic metadata (anime info, episode, quality, thumbnail)
 * - Download state (progress, status, file location)
 * - Technical details (file size, resume capability)
 * - Timestamps for organization and cleanup
 */
// Download item interface
export interface DownloadItem {
  id: string;                    // Unique identifier for the download
  animeId: string;              // Parent anime identifier for grouping
  episodeNumber: string;        // Episode number for organization
  audioType: 'sub' | 'dub';     // Audio track type for user preference
  title: string;                // Display title for UI and notifications
  downloadUrl: string;          // Source URL for the video file
  thumbnail: string;            // Episode thumbnail for visual identification
  filePath: string;             // Local file system path after download
  progress: number;             // Download progress (0-1 range)
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused'; // Current state
  size: number;                 // File size in bytes for storage management
  dateAdded: number;            // Timestamp for chronological sorting
  resumeData?: string | null;   // Resume token for interrupted downloads - can be string, null, or undefined
  isInGallery?: boolean;        // Flag indicating if file is saved to device gallery (for storage optimization)
}

/**
 * DownloadsContext Interface
 * 
 * Complete API for download management functionality:
 * - State tracking (downloads, queue, storage usage)
 * - Download operations (start, pause, resume, cancel)
 * - Data queries (by ID, by anime)
 * - Permission management for file system access
 */
interface DownloadsContextType {
  // State properties
  downloads: DownloadItem[];              // All downloads (completed, failed, pending)
  currentDownloads: DownloadItem[];       // Currently active downloads
  downloadQueue: DownloadItem[];          // Pending downloads waiting to start
  totalStorageUsed: number;               // Total bytes used by completed downloads
  isDownloading: boolean;                 // Global downloading state flag
  downloadPermissionGranted: boolean;     // Media library access permission status
  
  // Download management actions
  startDownload: (item: Omit<DownloadItem, 'progress' | 'status' | 'dateAdded' | 'filePath' | 'size'>) => Promise<void>;
  pauseDownload: (id: string) => Promise<boolean>;      // Pause active download
  resumeDownload: (id: string) => Promise<boolean>;     // Resume paused download
  cancelDownload: (id: string) => Promise<boolean>;     // Cancel and delete download
  removeDownload: (id: string) => Promise<boolean>;     // Remove completed download
  clearAllDownloads: () => Promise<boolean>;            // Clear all downloads and files
  
  // Query helpers
  getDownloadById: (id: string) => DownloadItem | undefined;        // Find specific download
  getDownloadsByAnimeId: (animeId: string) => DownloadItem[];       // Get all episodes for anime
  requestDownloadPermissions: () => Promise<boolean>;               // Request file system permissions
  validateAndCleanupDownloads: () => Promise<void>;                // Validate file existence and cleanup orphaned entries
}

// Create the downloads context
const DownloadsContext = createContext<DownloadsContextType | undefined>(undefined);

/**
 * useDownloads Hook
 * 
 * Custom hook to access the downloads context with error handling.
 * Ensures the hook is only used within the DownloadsProvider scope.
 * 
 * @returns DownloadsContextType - The complete downloads context
 * @throws Error if used outside of DownloadsProvider
 */
export const useDownloads = () => {
  const context = useContext(DownloadsContext);
  if (context === undefined) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return context;
};

/**
 * DownloadsProvider Component
 * 
 * Comprehensive download management provider that handles:
 * - Multi-concurrent download operations with queue management
 * - Resumable downloads with automatic retry capabilities
 * - Real-time progress tracking with throttled UI updates
 * - Background download notifications with progress indicators
 * - File system management and media library integration
 * - Storage persistence and crash recovery
 * - Permission handling for file system access
 * 
 * Architecture Features:
 * - Non-blocking UI operations using requestAnimationFrame
 * - Throttled progress updates to prevent performance issues
 * - Automatic queue processing with concurrent download limits
 * - Comprehensive error handling and recovery mechanisms
 * - Cross-platform notification system integration
 */
export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core download state management
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);           // All downloads history
  const [currentDownloads, setCurrentDownloads] = useState<DownloadItem[]>([]);  // Active downloads
  const [downloadQueue, setDownloadQueue] = useState<DownloadItem[]>([]);   // Pending downloads
  
  // Global state indicators
  const [isDownloading, setIsDownloading] = useState(false);               // Processing flag for UI
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);             // Storage usage tracking
  const [downloadPermissionGranted, setDownloadPermissionGranted] = useState(false); // Permission status
  
  // Internal operation tracking to prevent race conditions
  const isProcessingDownload = useRef(false);
  
  // Active download references for pause/resume functionality
  const downloadRefsMap = React.useRef<Record<string, FileSystem.DownloadResumable>>({});
  
  // Notification ID mapping for progress updates and completion alerts
  const notificationIdsMap = React.useRef<Record<string, string>>({});
  
  /**
   * Resume Data Utility Functions
   * 
   * Helper functions to handle resume data parsing and validation:
   * - Safely parse resume data from different formats
   * - Validate resume data integrity
   * - Handle fallback scenarios when resume data is corrupted
   */
  
  // Parse and validate resume data from various formats
  const parseResumeData = (resumeData: any): any => {
    if (!resumeData) return null;
    
    // If it's a string, return as-is (most common case for resume data)
    if (typeof resumeData === 'string') {
      return resumeData;
    }
    
    // If it's an object, try to stringify it
    if (typeof resumeData === 'object' && resumeData !== null) {
      try {
        return JSON.stringify(resumeData);
      } catch {
        return null;
      }
    }
    
    return null;
  };
  
  // Validate if resume data appears to be valid
  const isValidResumeData = (resumeData: any): boolean => {
    if (!resumeData) return false;
    
    // For string resume data, check if it's not empty
    if (typeof resumeData === 'string') {
      return resumeData.length > 0 && resumeData.trim() !== '';
    }
    
    // For other types, be more permissive
    return false;
  };
  
  // Create a clean restart for failed downloads
  const restartDownload = async (download: DownloadItem): Promise<void> => {
    console.log('Restarting download from beginning:', download.id);
    
    // Clean up any existing partial file
    if (download.filePath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(download.filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(download.filePath);
          console.log('Deleted partial file for restart:', download.filePath);
        }
      } catch (error) {
        console.warn('Could not delete partial file:', error);
      }
    }
    
    // Reset download state and add to queue
    const restartedDownload = {
      ...download,
      status: 'pending' as const,
      progress: 0,
      resumeData: null
    };
    
    // Update the download in the list
    setDownloads(prevDownloads => 
      prevDownloads.map(d => 
        d.id === download.id ? restartedDownload : d
      )
    );
    
    // Add to queue for processing
    setDownloadQueue(prev => {
      // Avoid duplicates
      if (prev.find(d => d.id === download.id)) {
        return prev;
      }
      return [...prev, restartedDownload];
    });
  };
  
  /**
   * Notification Configuration Function
   * 
   * Sets up the notification system for download progress tracking:
   * - Requests notification permissions from the user
   * - Configures notification channels for Android devices
   * - Sets up notification handlers for background behavior
   * - Establishes response listeners for user interaction
   * - Creates consistent notification experience across platforms
   */
  // Configure notifications
  const configureNotifications = async () => {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Notification permissions denied');
      return;
    }
    
    // Set notification handler for background behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,      // Show alert when app is open
        shouldPlaySound: false,     // Silent notifications for downloads
        shouldSetBadge: false,      // No badge count updates
      }),
    });
    
    // Create notification channel for Android (iOS handles this automatically)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('downloads', {
        name: 'Downloads',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Setup notification response listener for user interaction
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const downloadId = data.downloadId as string;
      
      // Handle user tapping on completed download notification
      if (data.status === 'completed' && downloadId) {
        // Could navigate to downloads page or specific episode
      } 
    });
    
    return () => subscription.remove();
  };
  
  /**
   * Downloads Initialization Effect
   * 
   * Handles app startup and download state restoration:
   * - Checks and requests media library permissions
   * - Configures the notification system
   * - Loads persisted downloads from AsyncStorage
   * - Calculates total storage usage for UI display
   * - Recovers interrupted downloads and updates their status
   * - Separates downloads by status for queue management
   */
  // Initialize downloads from storage
  useEffect(() => {
    const initDownloads = async () => {
      try {
        // Check media library permissions for saving to gallery
        const { status } = await MediaLibrary.getPermissionsAsync();
        setDownloadPermissionGranted(status === 'granted');
        
        // Configure notification system
        await configureNotifications();
        
        // Load saved downloads from persistent storage
        const storedDownloads = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
        if (storedDownloads) {
          const parsedDownloads = JSON.parse(storedDownloads) as DownloadItem[];
          setDownloads(parsedDownloads);
          
          // Calculate total storage used for display - only count completed downloads
          const totalSize = parsedDownloads
            .filter(item => item.status === 'completed')
            .reduce((sum, item) => sum + (item.size || 0), 0);
          setTotalStorageUsed(totalSize);
          
          // Separate downloads by status for queue management
          const active = parsedDownloads.filter(d => d.status === 'downloading' || d.status === 'pending');
          setCurrentDownloads(parsedDownloads.filter(d => d.status === 'downloading'));
          setDownloadQueue(active.filter(d => d.status === 'pending'));
          
          // Recovery: Handle downloads that were interrupted when app was closed
          for (const download of active) {
            if (download.status === 'downloading') {
              // Verify if the file still exists
              const fileInfo = await FileSystem.getInfoAsync(download.filePath);
              if (!fileInfo.exists) {
                // File doesn't exist anymore, mark as failed
                updateDownloadStatus(download.id, 'failed');
              } else {
                // Pause the download since we're restarting
                updateDownloadStatus(download.id, 'paused');
              }
            }
          }
          
          // Validate all downloads after initialization
          setTimeout(() => {
            validateAndCleanupDownloads();
          }, 1000); // Small delay to ensure all state is settled
        }
      } catch (error) {
        console.error('Error initializing downloads:', error);
      }
    };
    
    initDownloads();
  }, []);
  
  /**
   * Downloads Persistence Effect
   * 
   * Manages automatic saving of download state to AsyncStorage:
   * - Debounces storage writes to prevent excessive I/O operations
   * - Uses requestAnimationFrame for non-blocking UI updates
   * - Recalculates storage usage when downloads change
   * - Provides error handling for storage operations
   * - Cleans up timeouts on component unmount
   */
  // Update downloads in AsyncStorage whenever they change
  useEffect(() => {
    // Debounce the storage update to avoid frequent I/O operations
    let saveTimeout: NodeJS.Timeout | undefined;
    
    const saveDownloads = async () => {
      try {
        // Use requestAnimationFrame to avoid blocking the UI thread
        requestAnimationFrame(async () => {
          await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(downloads));
          
          // Recalculate storage used without blocking UI - only count completed downloads that still have local files
          const totalSize = downloads
            .filter(item => item.status === 'completed' && !item.isInGallery)
            .reduce((sum, item) => sum + (item.size || 0), 0);
          setTotalStorageUsed(totalSize);
        });
      } catch (error) {
        console.error('Error saving downloads:', error);
      }
    };
    
    if (downloads.length > 0) {
      // Debounce the save operation to avoid too many storage writes
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveDownloads, 500);
    }
    
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };  }, [downloads]);

  /**
   * Download State Consistency Check Effect
   * 
   * Periodically ensures that completed downloads are not incorrectly 
   * showing as active in the currentDownloads list, which fixes UI
   * inconsistencies where downloads appear to be "downloading" after completion
   */
  useEffect(() => {
    const consistencyInterval = setInterval(() => {
      ensureDownloadStateConsistency();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(consistencyInterval);
  }, []);

  /**
   * Download Queue Processing Effect
   * 
   * Automated queue management system that:
   * - Monitors queue state and current download capacity
   * - Limits concurrent downloads to prevent bandwidth saturation
   * - Uses non-blocking scheduling to maintain UI responsiveness
   * - Automatically starts next downloads when capacity is available
   * - Prevents duplicate processing through ref-based flags
   */
  // Process download queue using a non-blocking approach
  useEffect(() => {
    // Skip if we're already processing a download
    if (isProcessingDownload.current) {
      return;
    }
    
    // Prevent UI blocking by using requestAnimationFrame and setTimeout
    const processQueue = () => {
      // Use requestAnimationFrame for smooth UI
      const processQueueFrame = requestAnimationFrame(() => {
        // Then use setTimeout to move the actual work off the main thread
        setTimeout(() => {
          // Only start a new download if conditions are met
          if (downloadQueue.length > 0 && currentDownloads.length < 2 && !isDownloading && !isProcessingDownload.current) {
            const nextDownload = downloadQueue[0];
            
            // Remove from queue and add to current downloads using state updater functions
            setDownloadQueue(prevQueue => prevQueue.filter(d => d.id !== nextDownload.id));
            setCurrentDownloads(prev => [...prev, nextDownload]);
            
            // Start the download in the background
            startDownloadProcess(nextDownload);
          }
        }, 0);
      });
      
      return () => {
        cancelAnimationFrame(processQueueFrame);
      };
    };
    
    const cleanup = processQueue();
    return cleanup;
  }, [downloadQueue, currentDownloads, isDownloading]);
  
  /**
   * Permission Request Function
   * 
   * Requests media library permissions for saving downloads to device gallery.
   * Updates the permission state for UI conditional rendering.
   * 
   * @returns Promise<boolean> - Whether permission was granted
   */
  // Request media library permissions
  const requestDownloadPermissions = async () => {
    try {
      console.log('Requesting media library permissions...');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log('Media library permission status:', status);
      
      const granted = status === 'granted';
      setDownloadPermissionGranted(granted);
      
      if (granted) {
        console.log('Media library permissions granted');
      } else {
        console.log('Media library permissions denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      setDownloadPermissionGranted(false);
      return false;
    }
  };
  
  /**
   * Download Status Update Function
   * 
   * Throttled update system for download status changes:
   * - Uses requestAnimationFrame to prevent UI blocking
   * - Throttles updates to maintain performance during rapid progress changes
   * - Updates both main downloads list and category-specific lists
   * - Manages transitions between download states (pending, downloading, completed)
   * - Ensures consistent state across all download tracking systems
   */
  // Update a download's status using requestAnimationFrame to prevent UI blocking
  const updateDownloadStatus = (id: string, status: DownloadItem['status'], progress?: number, size?: number) => {
    // Throttle the UI updates for download status
    let updateThrottleTimeout: NodeJS.Timeout | undefined;
    
    // Use requestAnimationFrame to ensure UI updates don't block the main thread
    if (updateThrottleTimeout) {
      clearTimeout(updateThrottleTimeout);
    }
    
    updateThrottleTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        setDownloads(prevDownloads => 
          prevDownloads.map(download => {
            if (download.id === id) {
              // Never overwrite completed status with downloading status to prevent race conditions
              if (download.status === 'completed' && status === 'downloading') {
                return download; // Keep completed status
              }
              
              // For resumed downloads, always allow status updates to 'downloading'
              // Only protect against overwriting user-initiated pauses when download is actively running
              if (download.status === 'paused' && status === 'downloading') {
                // Check if this is a legitimate resume operation by looking at downloadRefsMap
                if (!downloadRefsMap.current[id]) {
                  return download; // Keep paused state if no active download reference
                }
                // Allow update if there's an active download reference (legitimate resume)
              }
              
              return { 
                ...download, 
                status, 
                ...(progress !== undefined ? { progress } : {}),
                ...(size !== undefined ? { size } : {})
              };
            }
            return download;
          })
        );
        
        // Update current downloads or queue based on status
        if (status === 'completed' || status === 'failed') {
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        } else if (status === 'paused') {
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        } else if (status === 'downloading') {
          setCurrentDownloads(prev => {
            const existingDownload = prev.find(d => d.id === id);
            if (!existingDownload) {
              const download = downloads.find(d => d.id === id);
              if (download) {
                // Don't add to current downloads if it's already completed
                if (download.status === 'completed') {
                  return prev;
                }
                // Create updated download with new status and progress
                const updatedDownload = { 
                  ...download, 
                  status: 'downloading' as const,
                  ...(progress !== undefined ? { progress } : {}),
                  ...(size !== undefined ? { size } : {})
                };
                return [...prev, updatedDownload];
              }
            } else {
              // Update existing download in current downloads
              return prev.map(d => d.id === id ? {
                ...d,
                status: 'downloading' as const,
                ...(progress !== undefined ? { progress } : {}),
                ...(size !== undefined ? { size } : {})
              } : d);
            }
            return prev;
          });
        }
      });
    }, 100); // 100ms throttle to prevent too many updates
  };
  
  /**
   * Download Notification Creation Function
   * 
   * Creates initial notification for new downloads:
   * - Generates consistent notification identifiers
   * - Sets up notification content with download metadata
   * - Stores notification mapping for later updates
   * - Handles notification creation errors gracefully
   */
  // Create a new download notification
  const createDownloadNotification = async (downloadItem: DownloadItem) => {
    try {
      // Create a consistent identifier for this download's notification
      const notificationIdentifier = `download_${downloadItem.id}`;
      
      // Create notification for this download
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Downloading: ${downloadItem.title}`,
          body: `Episode ${downloadItem.episodeNumber} - Starting download`,
          data: { downloadId: downloadItem.id, progress: 0 }
        },
        identifier: notificationIdentifier,
        trigger: null
      });
      
      // Store the notification ID and identifier
      notificationIdsMap.current[downloadItem.id] = notificationIdentifier;
      return notificationIdentifier;
    } catch (error) {
      console.error('Error creating download notification:', error);
      return null;
    }
  };

  /**
   * Download Notification Update Function
   * 
   * Updates existing download notifications with progress:
   * - Calculates and displays progress percentage
   * - Shows data transfer information (downloaded/total)
   * - Updates notification using consistent identifier
   * - Handles notification update errors gracefully
   */
  // Update an existing download notification
  const updateDownloadNotification = async (downloadItem: DownloadItem) => {
    try {
      const notificationIdentifier = notificationIdsMap.current[downloadItem.id];
      if (!notificationIdentifier) return;
      
      const progressPercent = Math.round(downloadItem.progress * 100);
      const sizeInfo = downloadItem.size > 0 
        ? `${formatBytes(downloadItem.size * downloadItem.progress)} of ${formatBytes(downloadItem.size)}`
        : 'Downloading...';
      
      // Update the notification using the same identifier
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Downloading: ${downloadItem.title}`,
          body: `Episode ${downloadItem.episodeNumber} - ${progressPercent}% (${sizeInfo})`,
          data: { downloadId: downloadItem.id, progress: progressPercent }
        },
        identifier: notificationIdentifier,
        trigger: null
      });
    } catch (error) {
      console.error('Error updating download notification:', error);
    }
  };

  /**
   * Download Completion Notification Function
   * 
   * Handles final notification states for completed downloads:
   * - Dismisses ongoing progress notifications
   * - Shows completion/failure notifications as appropriate
   * - Cleans up notification tracking data
   * - Provides different messages for success, failure, and cancellation
   */
  // Complete or dismiss a download notification
  const completeDownloadNotification = async (downloadItem: DownloadItem, status: 'completed' | 'failed' | 'cancelled') => {
    try {
      const notificationIdentifier = notificationIdsMap.current[downloadItem.id];
      if (!notificationIdentifier) return;
      
      // Dismiss the ongoing notification
      await Notifications.dismissNotificationAsync(notificationIdentifier);
      
      // Then show a completion notification with a different identifier
      const completionIdentifier = `${notificationIdentifier}_complete`;
      
      if (status === 'completed') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Download Complete',
            body: `${downloadItem.title} - Episode ${downloadItem.episodeNumber}`,
            data: { downloadId: downloadItem.id, status: 'completed' },
          },
          identifier: completionIdentifier,
          trigger: null
        });
      } else if (status === 'failed') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Download Failed',
            body: `${downloadItem.title} - Episode ${downloadItem.episodeNumber}`,
            data: { downloadId: downloadItem.id, status: 'failed' },
          },
          identifier: completionIdentifier,
          trigger: null
        });
      }
      
      // Remove the notification ID from our map
      delete notificationIdsMap.current[downloadItem.id];
    } catch (error) {
      console.error('Error completing download notification:', error);
    }
  };
  
  /**
   * Byte Formatting Utility Function
   * 
   * Converts byte values to human-readable format (KB, MB, GB, etc.).
   * Used for displaying file sizes and download progress in notifications and UI.
   * 
   * @param bytes - Number of bytes to format
   * @param decimals - Number of decimal places to show
   * @returns String representation of file size
   */
  // Helper function to format bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  /**
   * Download Process Function
   * 
   * Core download execution with comprehensive features:
   * - Non-blocking download processing to maintain UI responsiveness
   * - Directory creation and file path management
   * - Progress tracking with throttled updates for performance
   * - Resumable download support with proper cleanup
   * - Notification integration throughout the download lifecycle
   * - Media library integration for gallery access
   * - Robust error handling and recovery mechanisms
   */
  // Process download and update status
  const startDownloadProcess = async (downloadItem: DownloadItem) => {
    // If a download operation is already in progress, don't block the UI thread
    if (isProcessingDownload.current) {
      return;
    }
    
    // Mark that we're processing a download, but don't block UI
    isProcessingDownload.current = true;
    
    // Use a scheduler to avoid UI freezing
    const processDownload = async () => {
      try {
        setIsDownloading(true);
        updateDownloadStatus(downloadItem.id, 'downloading');
        
        // Create notification for this download
        await createDownloadNotification(downloadItem);
        
        // Define download directory path - use a gallery-accessible location for Android compatibility
        let downloadDir: string;
        let filePath: string;
        
        // Create a unique filename
        const fileName = `kaizen_${downloadItem.animeId}_${downloadItem.audioType}_${downloadItem.episodeNumber}.mp4`;
        
        if (Platform.OS === 'android') {
          // For Android, use cacheDirectory which is accessible to MediaLibrary
          // This avoids scoped storage restrictions while still allowing gallery access
          downloadDir = `${FileSystem.cacheDirectory}Downloads/`;
          filePath = `${downloadDir}${fileName}`;
        } else {
          // For iOS, continue using documentDirectory as it works fine
          downloadDir = `${FileSystem.documentDirectory}Downloads/`;
          filePath = `${downloadDir}${fileName}`;
        }
        
        // Ensure the downloads directory exists - wrap in requestAnimationFrame to avoid UI blocking
        await new Promise<void>((resolve) => {
          requestAnimationFrame(async () => {
            const dirInfo = await FileSystem.getInfoAsync(downloadDir);
            
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
            }
            resolve();
          });
        });
        
        // Update the file path in the item immediately (synchronously)
        downloadItem.filePath = filePath;
        setDownloads(prevDownloads => 
          prevDownloads.map(download => 
            download.id === downloadItem.id ? { ...download, filePath } : download
          )
        );
        
        // Create download resumable with a throttled progress callback
        let lastProgressUpdate = 0;
        const PROGRESS_UPDATE_INTERVAL = 500; // ms
        let isDownloadCompleted = false; // Flag to prevent race conditions
        
        const downloadResumable = FileSystem.createDownloadResumable(
          downloadItem.downloadUrl,
          filePath,
          {},
          (downloadProgress) => {
            // Don't update progress if download is already completed
            if (isDownloadCompleted) return;
            
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            const totalSize = downloadProgress.totalBytesExpectedToWrite;
            
            // Throttle UI updates to avoid blocking the main thread
            const now = Date.now();
            if (now - lastProgressUpdate > PROGRESS_UPDATE_INTERVAL) {
              lastProgressUpdate = now;
              
              // Update download status asynchronously to avoid UI blocking
              requestAnimationFrame(() => {
                // Double-check completion flag before updating
                if (!isDownloadCompleted) {
                  updateDownloadStatus(downloadItem.id, 'downloading', progress, totalSize);
                }
              });
              
              // Update notification with progress (throttle updates)
              const progressPercent = Math.round(progress * 100);
              if (progressPercent % 10 === 0) { // Update every 10% progress instead of 5%
                const updatedItem = {...downloadItem, progress, size: totalSize};
                updateDownloadNotification(updatedItem);
              }
            }
          }
        );
        
        // Store reference to allow pausing/canceling
        downloadRefsMap.current[downloadItem.id] = downloadResumable;
        
        // Start the download
        const result = await downloadResumable.downloadAsync();
        
        if (result) {
          // Set completion flag to prevent race conditions
          isDownloadCompleted = true;
          
          // Get file info immediately to ensure completion
          const fileInfo = await FileSystem.getInfoAsync(result.uri);
          const finalSize = (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : downloadItem.size);
          
          // Update the download with completed status and size immediately
          const completedItem = {
            ...downloadItem,
            status: 'completed' as const,
            progress: 1,
            size: finalSize,
            filePath: result.uri
          };
          
          // Update state immediately without requestAnimationFrame to ensure completion status is set
          setDownloads(prevDownloads => 
            prevDownloads.map(download => 
              download.id === downloadItem.id ? completedItem : download
            )
          );
          
          // Remove from current downloads immediately
          setCurrentDownloads(prev => prev.filter(d => d.id !== downloadItem.id));
          
          // Show completion notification
          await completeDownloadNotification(completedItem, 'completed');
          
          // Save to media library if permission granted
          if (downloadPermissionGranted) {
            try {
              console.log('Attempting to save to media library:', result.uri);
              
              // Try different approaches for Android scoped storage compatibility
              let asset;
              try {
                // First try: Direct asset creation (works on older Android versions)
                asset = await MediaLibrary.createAssetAsync(result.uri);
                console.log('Asset created successfully with direct method:', asset.id);
              } catch (directError) {
                console.log('Direct asset creation failed, trying alternative method...');
                
                // Second try: Copy to a public directory first (for newer Android versions)
                try {
                  // Use a temporary filename in the public downloads directory
                  const tempFileName = `kaizen_temp_${Date.now()}.mp4`;
                  const publicUri = `${FileSystem.documentDirectory}${tempFileName}`;
                  
                  // Copy the file to a location that MediaLibrary can access
                  await FileSystem.copyAsync({
                    from: result.uri,
                    to: publicUri
                  });
                  
                  // Create asset from the copied file
                  asset = await MediaLibrary.createAssetAsync(publicUri);
                  console.log('Asset created successfully with copy method:', asset.id);
                  
                  // Clean up the temporary file
                  try {
                    await FileSystem.deleteAsync(publicUri);
                    console.log('Temporary file cleaned up');
                  } catch (cleanupError) {
                    console.warn('Could not clean up temporary file:', cleanupError);
                  }
                } catch (copyError) {
                  console.error('Copy method also failed:', copyError);
                  throw directError; // Re-throw the original error
                }
              }
              
              // Check if Kaizen album exists, create if it doesn't
              let kaizenAlbum = await MediaLibrary.getAlbumAsync('Kaizen');
              if (!kaizenAlbum) {
                kaizenAlbum = await MediaLibrary.createAlbumAsync('Kaizen', asset, false);
                console.log('Kaizen album created successfully');
              } else {
                // Album exists, add asset to it
                await MediaLibrary.addAssetsToAlbumAsync([asset], kaizenAlbum, false);
                console.log('Asset added to existing Kaizen album');
              }
              
              console.log('Successfully saved to media library and album');
              
              // Storage optimization: Remove the app cache file after successfully saving to gallery
              // This prevents duplicate storage usage since the file is now in the device gallery
              try {
                console.log('Optimizing storage: Removing app cache file after gallery save...');
                await FileSystem.deleteAsync(result.uri);
                console.log('App cache file removed successfully to optimize storage');
                
                // Update the download item to indicate it's in gallery only
                const optimizedItem = {
                  ...completedItem,
                  filePath: '', // Clear local path since file is now only in gallery
                  isInGallery: true // Add flag to indicate it's saved to gallery
                };
                
                setDownloads(prevDownloads => 
                  prevDownloads.map(download => 
                    download.id === downloadItem.id ? optimizedItem : download
                  )
                );
                
                console.log('Download optimized: File removed from app cache, available in device gallery');
              } catch (deleteError) {
                console.warn('Could not remove app cache file after gallery save:', deleteError);
                // Don't fail the download if we can't optimize storage
              }
            } catch (error) {
              console.error('Error saving to media library:', error);
              
              // Check if this is the common Android scoped storage error
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (errorMessage.includes('Unable to copy file into external storage') || 
                  errorMessage.includes('scoped storage') ||
                  errorMessage.includes('external storage')) {
                console.log('Android scoped storage restriction detected. This is a known limitation on newer Android versions.');
                console.log('The download completed successfully and is available in the app, but cannot be saved to the device gallery due to system restrictions.');
              } else {
                console.log('Unexpected media library error occurred.');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in download process:', error);
        updateDownloadStatus(downloadItem.id, 'failed');
        
        // Show failed notification
        await completeDownloadNotification(downloadItem, 'failed');
      } finally {
        setIsDownloading(false);
        // Ensure the download is removed from current downloads (in case it wasn't done above)
        setCurrentDownloads(prev => prev.filter(d => d.id !== downloadItem.id));
        // Clean up the download reference
        delete downloadRefsMap.current[downloadItem.id];
        // Release the processing lock
        isProcessingDownload.current = false;
      }
    };
    
    // Process download in a way that doesn't block the UI
    setTimeout(processDownload, 0);
  };
  
  // Start new download
  const startDownload = async (
    item: Omit<DownloadItem, 'progress' | 'status' | 'dateAdded' | 'filePath' | 'size'>
  ) => {
    // Check if this episode is already downloaded or downloading
    const existingDownload = downloads.find(
      d => d.animeId === item.animeId && 
           d.episodeNumber === item.episodeNumber && 
           d.audioType === item.audioType
    );
    
    if (existingDownload) {
      if (existingDownload.status === 'completed') {
        showCustomAlert('Already Downloaded', 'This episode has already been downloaded.');
        return;
      } else if (['downloading', 'pending', 'paused'].includes(existingDownload.status)) {
        showCustomAlert('Download in Progress', 'This episode is already in your download queue.');
        return;
      }
    }
    
    // Create new download item
    const downloadItem: DownloadItem = {
      ...item,
      progress: 0,
      status: 'pending',
      dateAdded: Date.now(),
      filePath: '', // Will be set during download
      size: 0 // Will be updated after download
    };
    
    // Add to downloads state and queue
    setDownloads(prevDownloads => [...prevDownloads, downloadItem]);
    setDownloadQueue(prevQueue => [...prevQueue, downloadItem]);
  };
  
  // Pause a download
  const pauseDownload = async (id: string) => {
    const downloadRef = downloadRefsMap.current[id];
    const download = downloads.find(d => d.id === id);
    
    if (downloadRef && download) {
      try {
        // First, immediately update the status to prevent progress callbacks from overwriting
        setDownloads(prevDownloads => 
          prevDownloads.map(download => 
            download.id === id ? { 
              ...download, 
              status: 'paused' as const
            } : download
          )
        );
        
        console.log('Attempting to pause download:', id);
        const pauseResult = await downloadRef.pauseAsync();
        
        // Extract resume data properly - pauseResult itself should contain the resume data
        let resumeData: string | null = null;
        if (pauseResult && typeof pauseResult === 'object') {
          // Check if pauseResult has resumeData property
          if ('resumeData' in pauseResult && pauseResult.resumeData) {
            resumeData = typeof pauseResult.resumeData === 'string' ? pauseResult.resumeData : JSON.stringify(pauseResult.resumeData);
          } else if ('data' in pauseResult && pauseResult.data) {
            // Sometimes it's nested in a data property
            resumeData = typeof pauseResult.data === 'string' ? pauseResult.data : JSON.stringify(pauseResult.data);
          } else {
            // Sometimes the entire pauseResult object is the resume data
            try {
              resumeData = JSON.stringify(pauseResult);
            } catch (stringifyError) {
              console.warn('Could not stringify pause result:', stringifyError);
              resumeData = null;
            }
          }
        } else if (typeof pauseResult === 'string') {
          // If pauseResult is directly the resume data string
          resumeData = pauseResult;
        }
        
        console.log('Pause result type:', typeof pauseResult, 'Resume data available:', !!resumeData);
        if (resumeData) {
          console.log('Resume data type:', typeof resumeData, 'Resume data preview:', 
            typeof resumeData === 'string' ? resumeData.substring(0, 100) + '...' : 'Object');
        }
        
        // Update download status with resume data (ensure status stays paused)
        setDownloads(prevDownloads => 
          prevDownloads.map(download => 
            download.id === id ? { 
              ...download, 
              status: 'paused' as const,
              resumeData: resumeData
            } : download
          )
        );
        
        // Dismiss notification
        const notificationIdentifier = notificationIdsMap.current[id];
        if (notificationIdentifier) {
          await Notifications.dismissNotificationAsync(notificationIdentifier);
          delete notificationIdsMap.current[id];
        }
        
        // Remove from current downloads and clear the download reference
        setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        delete downloadRefsMap.current[id];
        
        console.log('Download paused successfully:', id, 'Resume data saved:', !!resumeData);
        return true;
      } catch (error) {
        console.error('Error pausing download:', error);
        // Even if pauseAsync fails, ensure status is set to paused
        setDownloads(prevDownloads => 
          prevDownloads.map(download => 
            download.id === id ? { 
              ...download, 
              status: 'paused' as const,
              resumeData: null // If pause failed, we can't resume properly
            } : download
          )
        );
        
        // Clean up
        setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        delete downloadRefsMap.current[id];
        
        return false;
      }
    }
    
    return false;
  };
  
  // Resume a paused download
  const resumeDownload = async (id: string) => {
    const download = downloads.find(d => d.id === id);
    
    if (!download || download.status !== 'paused') {
      console.log('Cannot resume download:', id, 'Status:', download?.status);
      return false;
    }

    // Check if already resuming to prevent multiple calls
    if (downloadRefsMap.current[id]) {
      console.log('Download already resuming:', id);
      return false;
    }

    // Create a temporary marker to prevent multiple simultaneous calls
    downloadRefsMap.current[id] = {} as FileSystem.DownloadResumable;
    
    try {
      // Set status to downloading immediately to prevent multiple resume attempts
      setDownloads(prevDownloads => 
        prevDownloads.map(d => 
          d.id === id ? { ...d, status: 'downloading' as const } : d
        )
      );
      
      // First, create notification for resumed download
      await createDownloadNotification(download);
      
      if (download.resumeData && download.filePath) {
        console.log('Resuming download with saved data:', id, 'FilePath:', download.filePath);
        
        // Log resume data details for debugging
        const details = {
          type: typeof download.resumeData,
          isValid: isValidResumeData(download.resumeData),
          length: typeof download.resumeData === 'string' ? download.resumeData.length : 'N/A',
          preview: typeof download.resumeData === 'string' ? download.resumeData.substring(0, 50) + '...' : 'Object'
        };
        console.log('Resume data details:', details);
        
        // Verify the partial file still exists
        try {
          const fileInfo = await FileSystem.getInfoAsync(download.filePath);
          if (!fileInfo.exists) {
            console.log('Partial file no longer exists, restarting download:', id);
            // Clean up and restart
            setCurrentDownloads(prev => prev.filter(d => d.id !== id));
            delete downloadRefsMap.current[id];
            await restartDownload(download);
            return true;
          }
        } catch (fileCheckError) {
          console.log('Error checking file existence, restarting download:', id);
          // Clean up and restart
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
          delete downloadRefsMap.current[id];
          await restartDownload(download);
          return true;
        }
        
        // Parse resume data if it's a string (sometimes it gets stringified)
        const parsedResumeData = parseResumeData(download.resumeData);
        
        // Validate resume data before using it
        if (!isValidResumeData(parsedResumeData)) {
          console.log('Resume data invalid or corrupted, restarting download:', id);
          // Clean up and restart
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
          delete downloadRefsMap.current[id];
          await restartDownload(download);
          return true;
        }
        
        console.log('Resume data type:', typeof parsedResumeData, 'Resume data available:', !!parsedResumeData);
        
        // Create downloadResumable with resume data
        let isResumeCompleted = false; // Flag to prevent race conditions in resume downloads
        const downloadResumable = FileSystem.createDownloadResumable(
          download.downloadUrl,
          download.filePath,
          {},
          (downloadProgress) => {
            // Don't update progress if download is already completed
            if (isResumeCompleted) return;
            
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            const totalSize = downloadProgress.totalBytesExpectedToWrite;
            
            // Always update progress/size regardless of status check to ensure UI updates
            // Only skip if download was explicitly cancelled/removed
            if (downloadRefsMap.current[id] && !isResumeCompleted) {
              updateDownloadStatus(id, 'downloading', progress, totalSize);
              
              // Update notification periodically
              const progressPercent = Math.round(progress * 100);
              if (progressPercent % 10 === 0) {
                const updatedItem = {...download, progress, size: totalSize};
                updateDownloadNotification(updatedItem);
              }
            }
          },
          parsedResumeData // Pass the processed resume data here
        );
        
        // Store reference for future pausing (replace the temporary marker)
        downloadRefsMap.current[id] = downloadResumable;
        
        // Update download status to downloading immediately and ensure it shows current progress
        setDownloads(prevDownloads => 
          prevDownloads.map(d => 
            d.id === id ? { ...d, status: 'downloading' as const } : d
          )
        );
        
        // Add to current downloads with current progress preserved
        setCurrentDownloads(prev => {
          if (!prev.find(d => d.id === id)) {
            return [...prev, { ...download, status: 'downloading' }];
          }
          return prev.map(d => d.id === id ? { ...d, status: 'downloading' } : d);
        });
        
        // Resume the download without timeout - let it handle its own network timeouts
        try {
          const result = await downloadResumable.resumeAsync();
          
          if (result) {
            // Set completion flag to prevent race conditions
            isResumeCompleted = true;
            
            // Handle completion
            const fileInfo = await FileSystem.getInfoAsync(result.uri);
            const finalSize = (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : download.size);
            
            const completedItem = {
              ...download,
              status: 'completed' as const,
              progress: 1,
              size: finalSize,
              filePath: result.uri
            };
            
            // Update state immediately
            setDownloads(prevDownloads => 
              prevDownloads.map(d => 
                d.id === id ? completedItem : d
              )
            );
            
            // Remove from current downloads immediately
            setCurrentDownloads(prev => prev.filter(d => d.id !== id));
            
            // Show completion notification
            await completeDownloadNotification(completedItem, 'completed');
            
            // Save to media library if permission granted
            if (downloadPermissionGranted) {
              try {
                console.log('Attempting to save to media library:', result.uri);
                
                // First, check if the file exists and is accessible
                const fileInfo = await FileSystem.getInfoAsync(result.uri);
                if (!fileInfo.exists) {
                  console.error('File does not exist for media library save:', result.uri);
                  throw new Error('File not found');
                }
                
                console.log('File exists, size:', fileInfo.size);
                console.log('Creating asset from file...');
                
                // Try different approaches for Android scoped storage compatibility
                let asset;
                try {
                  // First try: Direct asset creation (works on older Android versions)
                  asset = await MediaLibrary.createAssetAsync(result.uri);
                  console.log('Asset created successfully with direct method:', asset.id);
                } catch (directError) {
                  console.log('Direct asset creation failed, trying alternative method...');
                  
                  // Second try: Copy to a public directory first (for newer Android versions)
                  try {
                    // Use a temporary filename in the public downloads directory
                    const tempFileName = `kaizen_temp_${Date.now()}.mp4`;
                    const publicUri = `${FileSystem.documentDirectory}${tempFileName}`;
                    
                    // Copy the file to a location that MediaLibrary can access
                    await FileSystem.copyAsync({
                      from: result.uri,
                      to: publicUri
                    });
                    
                    // Create asset from the copied file
                    asset = await MediaLibrary.createAssetAsync(publicUri);
                    console.log('Asset created successfully with copy method:', asset.id);
                    
                    // Clean up the temporary file
                    try {
                      await FileSystem.deleteAsync(publicUri);
                      console.log('Temporary file cleaned up');
                    } catch (cleanupError) {
                      console.warn('Could not clean up temporary file:', cleanupError);
                    }
                  } catch (copyError) {
                    console.error('Copy method also failed:', copyError);
                    throw directError; // Re-throw the original error
                  }
                }
                
                // Check if Kaizen album exists, create if it doesn't
                console.log('Looking for Kaizen album...');
                let kaizenAlbum = await MediaLibrary.getAlbumAsync('Kaizen');
                
                if (!kaizenAlbum) {
                  console.log('Creating new Kaizen album with asset...');
                  kaizenAlbum = await MediaLibrary.createAlbumAsync('Kaizen', asset, false);
                  console.log('Kaizen album created successfully:', kaizenAlbum.id);
                } else {
                  console.log('Found existing Kaizen album, adding asset...');
                  // Album exists, add asset to it
                  await MediaLibrary.addAssetsToAlbumAsync([asset], kaizenAlbum, false);
                  console.log('Asset added to album successfully');
                }
                
                console.log('Successfully saved to media library and album');
                
                // Storage optimization: Remove the app cache file after successfully saving to gallery
                // This prevents duplicate storage usage since the file is now in the device gallery
                try {
                  console.log('Optimizing storage: Removing app cache file after gallery save...');
                  await FileSystem.deleteAsync(result.uri);
                  console.log('App cache file removed successfully to optimize storage');
                  
                  // Update the download item to indicate it's in gallery only
                  const optimizedItem = {
                    ...completedItem,
                    filePath: '', // Clear local path since file is now only in gallery
                    isInGallery: true // Add flag to indicate it's saved to gallery
                  };
                  
                  setDownloads(prevDownloads => 
                    prevDownloads.map(d => 
                      d.id === id ? optimizedItem : d
                    )
                  );
                  
                  console.log('Download optimized: File removed from app cache, available in device gallery');
                } catch (deleteError) {
                  console.warn('Could not remove app cache file after gallery save:', deleteError);
                  // Don't fail the download if we can't optimize storage
                }
                
              } catch (error) {
                console.error('Error saving to media library:', error);
                console.error('Error details:', error instanceof Error ? error.message : String(error));
                
                // Check if this is the common Android scoped storage error
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('Unable to copy file into external storage') || 
                    errorMessage.includes('scoped storage') ||
                    errorMessage.includes('external storage')) {
                  console.log('Android scoped storage restriction detected. This is a known limitation on newer Android versions.');
                  console.log('The download completed successfully and is available in the app, but cannot be saved to the device gallery due to system restrictions.');
                } else {
                  console.log('Unexpected media library error occurred.');
                }
                
                // Don't fail the download completion just because media library save failed
                console.log('Download completed successfully but could not save to gallery');
              }
            } else {
              console.log('Media library permission not granted, skipping gallery save');
            }
            
            // Clean up
            setCurrentDownloads(prev => prev.filter(d => d.id !== id));
            delete downloadRefsMap.current[id];
          } else {
            // If resume failed without result, clean up and mark as failed
            console.log('Resume completed but no result returned, marking as failed:', id);
            setCurrentDownloads(prev => prev.filter(d => d.id !== id));
            delete downloadRefsMap.current[id];
            updateDownloadStatus(id, 'failed');
          }
        } catch (resumeError) {
          console.error('Error during resume operation:', resumeError);
          
          // Clean up
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
          delete downloadRefsMap.current[id];
          
          // Handle specific resume errors
          const errorMessage = resumeError instanceof Error ? resumeError.message : String(resumeError);
          
          // If it's a network or resume data corruption issue, restart the download
          if (errorMessage.includes('network') || 
              errorMessage.includes('timeout') || 
              errorMessage.includes('Resume') ||
              errorMessage.includes('corrupt') ||
              errorMessage.includes('invalid') ||
              errorMessage.includes('expired') ||
              errorMessage.includes('connection') ||
              errorMessage.includes('ENOENT') ||
              errorMessage.includes('404') ||
              errorMessage.includes('500')) {
            console.log('Resume failed due to recoverable error, restarting download from beginning:', id);
            await restartDownload(download);
          } else {
            // For other errors, mark as failed
            console.log('Resume failed with non-recoverable error, marking as failed:', id, errorMessage);
            updateDownloadStatus(id, 'failed');
          }
          
          throw resumeError; // Re-throw to be caught by outer catch
        }
        
        return true;
      } else {
        console.log('No resume data or file path found, restarting download:', id);
        console.log('Resume data available:', !!download.resumeData, 'File path:', download.filePath);
        
        // Clean up the temporary marker since we're restarting
        setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        delete downloadRefsMap.current[id];
        
        // If no resume data or file path, restart the download
        await restartDownload(download);
        return true;
      }
    } catch (error) {
      console.error('Error resuming download:', error);
      
      // Clean up on error - remove temporary marker
      setCurrentDownloads(prev => prev.filter(d => d.id !== id));
      delete downloadRefsMap.current[id];
      
      // If resume fails, try restarting the download instead of marking as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('timeout') || 
          errorMessage.includes('Resume') ||
          errorMessage.includes('network') ||
          errorMessage.includes('corrupt') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('ENOENT')) {
        console.log('Resume failed due to recoverable error, restarting download:', id);
        await restartDownload(download);
        return true;
      } else {
        console.log('Resume failed with non-recoverable error, marking as failed:', id);
        updateDownloadStatus(id, 'failed');
        return false;
      }
    }
  };
  
  // Cancel a download
  const cancelDownload = async (id: string) => {
    const downloadRef = downloadRefsMap.current[id];
    if (downloadRef) {
      try {
        // Try to pause/cancel the download
        await downloadRef.pauseAsync();
        delete downloadRefsMap.current[id];
      } catch (error) {
        console.error('Error cancelling download:', error);
      }
    }
    
    // Find the download to get its file path
    const download = downloads.find(d => d.id === id);
    
    // Dismiss notification
    const notificationIdentifier = notificationIdsMap.current[id];
    if (notificationIdentifier) {
      await Notifications.dismissNotificationAsync(notificationIdentifier);
      delete notificationIdsMap.current[id];
    }
    
    // If there's a file, delete it
    if (download?.filePath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(download.filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(download.filePath);
          
          // Also try to remove from media library if permission is granted and file was completed
          if (downloadPermissionGranted && download.status === 'completed') {
            try {
              // First check if Kaizen album exists
              const kaizenAlbum = await MediaLibrary.getAlbumAsync('Kaizen');
              
              if (kaizenAlbum) {
                const assets = await MediaLibrary.getAssetsAsync({
                  first: 100,
                  album: kaizenAlbum,
                  mediaType: 'video'
                });
                
                const matchingAsset = assets.assets.find(asset => 
                  asset.uri.includes(download.episodeNumber) && 
                  asset.uri.includes(download.animeId)
                );
                
                if (matchingAsset) {
                  await MediaLibrary.deleteAssetsAsync([matchingAsset]);
                }
              }
            } catch (mediaError) {
              console.error('Error removing from media library:', mediaError);
            }
          }
        }
      } catch (error) {
        console.error('Error deleting download file:', error);
      }
    }
    
    // Remove from all lists
    const updatedDownloads = downloads.filter(d => d.id !== id);
    setDownloads(updatedDownloads);
    setCurrentDownloads(prev => prev.filter(d => d.id !== id));
    setDownloadQueue(prev => prev.filter(d => d.id !== id));
    
    // Update storage immediately
    try {
      await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
      // Recalculate storage used - only count completed downloads
      const totalSize = updatedDownloads
        .filter(item => item.status === 'completed')
        .reduce((sum, item) => sum + (item.size || 0), 0);
      setTotalStorageUsed(totalSize);
    } catch (error) {
      console.error('Error updating storage after cancel:', error);
    }
    
    return true;
  };
  
  // Remove a completed download
  const removeDownload = async (id: string) => {
    const download = downloads.find(d => d.id === id);
    
    if (!download) {
      return false;
    }
    
    // If download is active, cancel it first
    if (download.status === 'downloading' || download.status === 'pending') {
      await cancelDownload(id);
      return true;
    }
    
    // Delete the file if it exists
    if (download.filePath && download.status === 'completed') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(download.filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(download.filePath);
          
          // Also try to remove from media library if permission is granted
          if (downloadPermissionGranted) {
            try {
              // First check if Kaizen album exists
              const kaizenAlbum = await MediaLibrary.getAlbumAsync('Kaizen');
              
              if (kaizenAlbum) {
                const assets = await MediaLibrary.getAssetsAsync({
                  first: 100,
                  album: kaizenAlbum,
                  mediaType: 'video'
                });
                
                const matchingAsset = assets.assets.find(asset => 
                  asset.uri.includes(download.episodeNumber) && 
                  asset.uri.includes(download.animeId)
                );
                
                if (matchingAsset) {
                  await MediaLibrary.deleteAssetsAsync([matchingAsset]);
                }
              }
            } catch (mediaError) {
              console.error('Error removing from media library:', mediaError);
              // Don't fail the deletion if media library removal fails
            }
          }
        }
      } catch (error) {
        console.error('Error deleting download file:', error);
      }
    }
    
    // Remove from downloads
    const updatedDownloads = downloads.filter(d => d.id !== id);
    setDownloads(updatedDownloads);
    
    // Update storage immediately
    try {
      await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
      // Recalculate storage used - only count completed downloads
      const totalSize = updatedDownloads
        .filter(item => item.status === 'completed')
        .reduce((sum, item) => sum + (item.size || 0), 0);
      setTotalStorageUsed(totalSize);
    } catch (error) {
      console.error('Error updating storage after removal:', error);
    }
    
    return true;
  };
  
  // Clear all downloads
  const clearAllDownloads = async () => {
    // Cancel all active downloads
    await Promise.all(
      currentDownloads.map(d => cancelDownload(d.id))
    );
    
    // Delete all downloaded files
    await Promise.all(
      downloads
        .filter(d => d.status === 'completed' && d.filePath)
        .map(async (d) => {
          try {
            const fileInfo = await FileSystem.getInfoAsync(d.filePath);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(d.filePath);
              
              // Also try to remove from media library if permission is granted
              if (downloadPermissionGranted) {
                try {
                  // First check if Kaizen album exists
                  const kaizenAlbum = await MediaLibrary.getAlbumAsync('Kaizen');
                  
                  if (kaizenAlbum) {
                    const assets = await MediaLibrary.getAssetsAsync({
                      first: 100,
                      album: kaizenAlbum,
                      mediaType: 'video'
                    });
                  
                    const matchingAsset = assets.assets.find(asset => 
                      asset.uri.includes(d.episodeNumber) && 
                      asset.uri.includes(d.animeId)
                    );
                    
                    if (matchingAsset) {
                      await MediaLibrary.deleteAssetsAsync([matchingAsset]);
                    }
                  }
                } catch (mediaError) {
                  console.error('Error removing from media library:', mediaError);
                }
              }
            }
          } catch (error) {
            console.error('Error deleting file:', error);
          }
        })
    );
    
    // Clear all lists
    setDownloads([]);
    setCurrentDownloads([]);
    setDownloadQueue([]);
    setTotalStorageUsed(0);
    
    // Clear from storage
    await AsyncStorage.removeItem(DOWNLOADS_STORAGE_KEY);
    
    return true;
  };
  
  // Get a download by ID
  const getDownloadById = (id: string) => {
    return downloads.find(d => d.id === id);
  };
  
  // Get downloads by anime ID
  const getDownloadsByAnimeId = (animeId: string) => {
    return downloads.filter(d => d.animeId === animeId);
  };
  
  // Validate file existence and cleanup orphaned entries
  const validateAndCleanupDownloads = async () => {
    try {
      const validDownloads: DownloadItem[] = [];
      let totalSizeRecalculated = 0;
      
      for (const download of downloads) {
        if (download.status === 'completed' && download.filePath) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(download.filePath);
            if (fileInfo.exists) {
              // File exists, keep the download
              validDownloads.push(download);
              totalSizeRecalculated += download.size || 0;
            } else {
              // File doesn't exist, mark as failed or remove
              console.log(`File not found for download: ${download.title} - Episode ${download.episodeNumber}`);
              // Add as failed download so user knows what happened
              validDownloads.push({
                ...download,
                status: 'failed'
              });
            }
          } catch (error) {
            console.error('Error checking file existence:', error);
            // Keep the download but mark as failed
            validDownloads.push({
              ...download,
              status: 'failed'
            });
          }
        } else {
          // Keep non-completed downloads as is
          validDownloads.push(download);
          if (download.status === 'completed') {
            totalSizeRecalculated += download.size || 0;
          }
        }
      }
      
      // Update state if there were changes
      if (validDownloads.length !== downloads.length || 
          validDownloads.some((d, i) => downloads[i] && d.status !== downloads[i].status)) {
        setDownloads(validDownloads);
        setTotalStorageUsed(totalSizeRecalculated);
        
        // Update storage
        await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(validDownloads));
      }
    } catch (error) {
      console.error('Error validating downloads:', error);
    }
  };
  
  /**
   * Debug Logging for Download Operations
   * 
   * Enhanced logging system for better debugging of download issues:
   * - Logs resume data structure and validity
   * - Tracks download state transitions
   * - Records error patterns for analysis
   */
  
  // Enhanced logging for download operations
  const logDownloadOperation = (operation: string, downloadId: string, details?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DOWNLOAD ${operation.toUpperCase()}: ${downloadId}`, details || '');
  };
  
  // Log resume data details for debugging
  const logResumeDataDetails = (downloadId: string, resumeData: any) => {
    if (!resumeData) {
      logDownloadOperation('resume_data', downloadId, 'No resume data available');
      return;
    }
    
    const details = {
      type: typeof resumeData,
      isValid: isValidResumeData(resumeData),
      length: typeof resumeData === 'string' ? resumeData.length : 'N/A',
      preview: typeof resumeData === 'string' ? resumeData.substring(0, 50) + '...' : 'Object'
    };
    
    logDownloadOperation('resume_data', downloadId, details);
  };

  const contextValue: DownloadsContextType = {
    downloads,
    currentDownloads,
    downloadQueue,
    totalStorageUsed,
    isDownloading,
    downloadPermissionGranted,
    
    // Actions
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    clearAllDownloads,
    
    // Helpers
    getDownloadById,
    getDownloadsByAnimeId,
    requestDownloadPermissions,
    validateAndCleanupDownloads,
  };
  
  /**
   * Utility function to ensure download state consistency
   * 
   * Removes any completed or failed downloads from currentDownloads list
   * to prevent UI inconsistencies where completed downloads still show as downloading
   */
  const ensureDownloadStateConsistency = () => {
    setCurrentDownloads(prev => 
      prev.filter(download => 
        download.status === 'downloading' || 
        download.status === 'pending' || 
        download.status === 'paused'
      )
    );
  };
  
  return (
    <DownloadsContext.Provider value={contextValue}>
      {children}
    </DownloadsContext.Provider>
  );
};

export default DownloadsProvider;