import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

// Storage key for downloads
const DOWNLOADS_STORAGE_KEY = '@kaizen_downloads';

// Download item interface
export interface DownloadItem {
  id: string;
  animeId: string;
  episodeNumber: string;
  audioType: 'sub' | 'dub';
  title: string;
  downloadUrl: string;
  thumbnail: string;
  filePath: string;
  progress: number; // 0-1
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  size: number; // in bytes
  dateAdded: number; // timestamp
  resumeData?: string; // for resumable downloads
}

interface DownloadsContextType {
  downloads: DownloadItem[];
  currentDownloads: DownloadItem[];
  downloadQueue: DownloadItem[];
  totalStorageUsed: number;
  isDownloading: boolean;
  downloadPermissionGranted: boolean;
  
  // Actions
  startDownload: (item: Omit<DownloadItem, 'progress' | 'status' | 'dateAdded' | 'filePath' | 'size'>) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;
  removeDownload: (id: string) => Promise<boolean>;
  clearAllDownloads: () => Promise<boolean>;
  
  // Helpers
  getDownloadById: (id: string) => DownloadItem | undefined;
  getDownloadsByAnimeId: (animeId: string) => DownloadItem[];
  requestDownloadPermissions: () => Promise<boolean>;
}

const DownloadsContext = createContext<DownloadsContextType | undefined>(undefined);

export const useDownloads = () => {
  const context = useContext(DownloadsContext);
  if (context === undefined) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return context;
};

export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [currentDownloads, setCurrentDownloads] = useState<DownloadItem[]>([]);
  const [downloadQueue, setDownloadQueue] = useState<DownloadItem[]>([]);
  // Tracks if the download processor is working, but doesn't block UI
  const [isDownloading, setIsDownloading] = useState(false);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [downloadPermissionGranted, setDownloadPermissionGranted] = useState(false);
  
  // Flag to track if a download operation is in progress (for internal use)
  const isProcessingDownload = useRef(false);
  
  // Active download references
  const downloadRefsMap = React.useRef<Record<string, FileSystem.DownloadResumable>>({});
  // Download notification IDs mapping
  const notificationIdsMap = React.useRef<Record<string, string>>({});
  
  // Configure notifications
  const configureNotifications = async () => {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Notification permissions denied');
      return;
    }
    
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('downloads', {
        name: 'Downloads',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Setup notification response listener
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const downloadId = data.downloadId as string;
      
      // If the notification is for a completed download and user taps it,
      // we could navigate to the downloads page or handle some specific action
      if (data.status === 'completed' && downloadId) {
        // Handle completed download tap
      } 
    });
    
    return () => subscription.remove();
  };
  
  // Initialize downloads from storage
  useEffect(() => {
    const initDownloads = async () => {
      try {
        // Check media library permissions
        const { status } = await MediaLibrary.getPermissionsAsync();
        setDownloadPermissionGranted(status === 'granted');
        
        // Configure notifications
        await configureNotifications();
        
        // Load saved downloads
        const storedDownloads = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);
        if (storedDownloads) {
          const parsedDownloads = JSON.parse(storedDownloads) as DownloadItem[];
          setDownloads(parsedDownloads);
          
          // Calculate storage used
          const totalSize = parsedDownloads.reduce((sum, item) => sum + (item.size || 0), 0);
          setTotalStorageUsed(totalSize);
          
          // Separate downloads by status
          const active = parsedDownloads.filter(d => d.status === 'downloading' || d.status === 'pending');
          setCurrentDownloads(parsedDownloads.filter(d => d.status === 'downloading'));
          setDownloadQueue(active.filter(d => d.status === 'pending'));
          
          // If there were active downloads when app was closed, update their status
          for (const download of active) {
            if (download.status === 'downloading') {
              // Find if file exists and update status
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
  
  // Update downloads in AsyncStorage whenever they change
  useEffect(() => {
    // Debounce the storage update to avoid frequent I/O operations
    let saveTimeout: NodeJS.Timeout | undefined;
    
    const saveDownloads = async () => {
      try {
        // Use a worker or batched operation to avoid blocking the UI thread
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
  
  // Process download queue using a non-blocking approach
  useEffect(() => {
    // Skip if we're already processing a download
    if (isProcessingDownload.current) {
      return;
    }
    
    // Prevent UI blocking by using a combination of requestAnimationFrame and setTimeout
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
  
  // Request media library permissions
  const requestDownloadPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const granted = status === 'granted';
    setDownloadPermissionGranted(granted);
    return granted;
  };
  
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
  
  // Helper function to format bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
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
              
              // Save to media library
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