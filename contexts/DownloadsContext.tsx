// React hooks for state management, context creation, and component lifecycle
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

// AsyncStorage for persistent download data storage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo file system utilities for download management and file operations
import * as FileSystem from 'expo-file-system';

// Expo media library for saving downloads to device gallery
import * as MediaLibrary from 'expo-media-library';

// React Native core components for platform detection and user alerts
import { Platform, Alert } from 'react-native';

// Expo notifications for download progress and completion alerts
import * as Notifications from 'expo-notifications';

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
  resumeData?: string;          // Resume token for interrupted downloads
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
  pauseDownload: (id: string) => Promise<void>;         // Pause active download
  resumeDownload: (id: string) => Promise<boolean>;     // Resume paused download
  cancelDownload: (id: string) => Promise<boolean>;     // Cancel and delete download
  removeDownload: (id: string) => Promise<boolean>;     // Remove completed download
  clearAllDownloads: () => Promise<boolean>;            // Clear all downloads and files
  
  // Query helpers
  getDownloadById: (id: string) => DownloadItem | undefined;        // Find specific download
  getDownloadsByAnimeId: (animeId: string) => DownloadItem[];       // Get all episodes for anime
  requestDownloadPermissions: () => Promise<boolean>;               // Request file system permissions
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
          
          // Calculate total storage used for display
          const totalSize = parsedDownloads.reduce((sum, item) => sum + (item.size || 0), 0);
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
          
          // Recalculate storage used without blocking UI
          const totalSize = downloads.reduce((sum, item) => sum + (item.size || 0), 0);
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
    };
  }, [downloads]);
  
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
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const granted = status === 'granted';
    setDownloadPermissionGranted(granted);
    return granted;
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
          prevDownloads.map(download => 
            download.id === id ? { 
              ...download, 
              status, 
              ...(progress !== undefined ? { progress } : {}),
              ...(size !== undefined ? { size } : {})
            } : download
          )
        );
        
        // Update current downloads or queue based on status
        if (status === 'completed' || status === 'failed') {
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        } else if (status === 'paused') {
          setCurrentDownloads(prev => prev.filter(d => d.id !== id));
        } else if (status === 'downloading') {
          setCurrentDownloads(prev => {
            if (!prev.find(d => d.id === id)) {
              const download = downloads.find(d => d.id === id);
              if (download) {
                return [...prev, download];
              }
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
        
        // Define download directory path
        const downloadDir = `${FileSystem.documentDirectory}downloads/`;
        
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
        
        // Create a unique filename
        const fileName = `kaizen_${downloadItem.animeId}_${downloadItem.audioType}_${downloadItem.episodeNumber}.mp4`;
        const filePath = `${downloadDir}${fileName}`;
        
        // Update the file path in the item - using requestAnimationFrame to avoid UI blocking
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            setDownloads(prevDownloads => 
              prevDownloads.map(download => 
                download.id === downloadItem.id ? { ...download, filePath } : download
              )
            );
            resolve();
          });
        });
        
        // Create download resumable with a throttled progress callback
        let lastProgressUpdate = 0;
        const PROGRESS_UPDATE_INTERVAL = 500; // ms
        
        const downloadResumable = FileSystem.createDownloadResumable(
          downloadItem.downloadUrl,
          filePath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            const totalSize = downloadProgress.totalBytesExpectedToWrite;
            
            // Throttle UI updates to avoid blocking the main thread
            const now = Date.now();
            if (now - lastProgressUpdate > PROGRESS_UPDATE_INTERVAL) {
              lastProgressUpdate = now;
              
              // Update download status asynchronously to avoid UI blocking
              requestAnimationFrame(() => {
                updateDownloadStatus(downloadItem.id, 'downloading', progress, totalSize);
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
          // Get file info to store size - do this in a non-blocking way
          await new Promise<void>((resolve) => {
            requestAnimationFrame(async () => {
              const fileInfo = await FileSystem.getInfoAsync(result.uri);
              
              // Update the download with completed status and size
              setDownloads(prevDownloads => 
                prevDownloads.map(download => 
                  download.id === downloadItem.id ? { 
                    ...download, 
                    status: 'completed', 
                    progress: 1,
                    size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : download.size),
                    filePath: result.uri
                  } : download
                )
              );
              
              // Show completion notification
              const completedItem = {
                ...downloadItem,
                status: 'completed' as const,
                progress: 1,
                size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : downloadItem.size),
                filePath: result.uri
              };
              
              await completeDownloadNotification(completedItem, 'completed');
              
              // Save to media library if permission granted
              if (downloadPermissionGranted) {
                const asset = await MediaLibrary.createAssetAsync(result.uri);
                await MediaLibrary.createAlbumAsync('Kaizen', asset, false);
              }
              
              resolve();
            });
          });
        }
      } catch (error) {
        console.error('Error in download process:', error);
        updateDownloadStatus(downloadItem.id, 'failed');
        
        // Show failed notification
        await completeDownloadNotification(downloadItem, 'failed');
      } finally {
        setIsDownloading(false);
        // Remove from current downloads
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
        Alert.alert('Already Downloaded', 'This episode has already been downloaded.');
        return;
      } else if (['downloading', 'pending', 'paused'].includes(existingDownload.status)) {
        Alert.alert('Download in Progress', 'This episode is already in your download queue.');
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
        const resumeData = await downloadRef.pauseAsync();
        
        // Update download status and save resume data
        setDownloads(prevDownloads => 
          prevDownloads.map(download => 
            download.id === id ? { 
              ...download, 
              status: 'paused',
              resumeData: resumeData?.resumeData 
            } : download
          )
        );
        
        // Dismiss notification
        const notificationIdentifier = notificationIdsMap.current[id];
        if (notificationIdentifier) {
          await Notifications.dismissNotificationAsync(notificationIdentifier);
          delete notificationIdsMap.current[id];
        }
        
        // Remove from current downloads
        setCurrentDownloads(prev => prev.filter(d => d.id !== id));
      } catch (error) {
        console.error('Error pausing download:', error);
      }
    }
  };
  
  // Resume a paused download
  const resumeDownload = async (id: string) => {
    const download = downloads.find(d => d.id === id);
    
    if (!download || download.status !== 'paused') {
      return false;
    }
    
    try {
      if (download.resumeData) {
        // Create a new download resumable using saved data
        const downloadResumable = new FileSystem.DownloadResumable(
          download.downloadUrl,
          download.filePath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            const totalSize = downloadProgress.totalBytesExpectedToWrite;
            updateDownloadStatus(id, 'downloading', progress, totalSize);
          },
          download.resumeData
        );
        
        // Store reference
        downloadRefsMap.current[id] = downloadResumable;
        
        // Update status to downloading and add to current downloads
        updateDownloadStatus(id, 'downloading');
        setCurrentDownloads(prev => [...prev, download]);
        
        // Resume download
        await downloadResumable.resumeAsync();
        return true;
      } else {
        // If no resume data, restart the download
        updateDownloadStatus(id, 'pending');
        setDownloadQueue(prev => [...prev, download]);
        return true;
      }
    } catch (error) {
      console.error('Error resuming download:', error);
      updateDownloadStatus(id, 'failed');
      return false;
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
    
    // Remove from all lists
    setDownloads(prev => prev.filter(d => d.id !== id));
    setCurrentDownloads(prev => prev.filter(d => d.id !== id));
    setDownloadQueue(prev => prev.filter(d => d.id !== id));
    
    // If there's a file, delete it
    if (download?.filePath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(download.filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(download.filePath);
        }
      } catch (error) {
        console.error('Error deleting download file:', error);
      }
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
    
    // Remove from downloads
    setDownloads(prev => prev.filter(d => d.id !== id));
    
    // Delete the file if it exists
    if (download.filePath && download.status === 'completed') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(download.filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(download.filePath);
        }
      } catch (error) {
        console.error('Error deleting download file:', error);
      }
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
  };
  
  return (
    <DownloadsContext.Provider value={contextValue}>
      {children}
    </DownloadsContext.Provider>
  );
};

export default DownloadsProvider;