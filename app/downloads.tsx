// React core for component creation and state management
import React, { useState, useEffect } from 'react';

// React Native core components for UI rendering and device interaction
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform
} from 'react-native';

// Status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// Expo Router for navigation
import { useRouter } from 'expo-router';

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Application color constants for consistent theming
import Colors from '../constants/Colors';

// Downloads context for managing offline content
import { useDownloads } from '../contexts/DownloadsContext';

// Custom alert components for dark-themed alerts
import { showCustomAlert, showErrorAlert, showConfirmAlert } from '../components/CustomAlert';

// Expo file system utilities for file operations
import * as FileSystem from 'expo-file-system';

// Date formatting utilities for displaying timestamps
import { formatDistanceToNow, format } from 'date-fns';

// Component-specific styles
import { styles } from '../styles/downloads.styles';

/**
 * Utility function to format bytes into human-readable file sizes
 * Converts bytes to appropriate units (Bytes, KB, MB, GB, etc.)
 * 
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places to show
 * @returns Formatted size string with appropriate unit
 */
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * DownloadsPage Component
 * 
 * Comprehensive download management interface that provides:
 * - Visual display of all downloaded anime episodes
 * - Download queue management with pause/resume/cancel functionality
 * - File size and storage usage tracking
 * - Filtering by download status (all, completed, active)
 * - Sorting by date, name, or file size
 * - Playback of completed downloads
 * - Permission handling for file system access
 * - Bulk operations for clearing all downloads
 */
export default function DownloadsPage() {
  const router = useRouter();
  
  // Extract download management functionality from context
  const { 
    downloads, // Array of all download items
    currentDownloads, // Currently active downloads
    downloadQueue, // Queued downloads waiting to start
    totalStorageUsed, // Total disk space used by downloads
    removeDownload, // Function to delete a download
    pauseDownload, // Function to pause an active download
    resumeDownload, // Function to resume a paused download
    cancelDownload, // Function to cancel a pending/active download
    clearAllDownloads, // Function to remove all downloads
    downloadPermissionGranted, // Permission status for file system
    requestDownloadPermissions, // Function to request file permissions
    validateAndCleanupDownloads // Function to validate file existence and cleanup
  } = useDownloads();
  
  // Local state for UI filtering and sorting
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all'); // Current filter mode
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date'); // Current sort method
  
  /**
   * Permission Request Effect
   * 
   * Ensures the app has necessary file system permissions for download operations.
   * Automatically requests permissions if not already granted.
   * Critical for Android devices with storage permission requirements.
   */
  // Request permissions if needed
  useEffect(() => {
    const checkPermissions = async () => {
      if (!downloadPermissionGranted) {
        await requestDownloadPermissions();
      }
    };
    
    checkPermissions();
  }, [downloadPermissionGranted]);

  /**
   * File Validation Effect
   * 
   * Validates file existence when the page loads to ensure downloads are still available.
   * Helps identify files that may have been deleted externally.
   */
  useEffect(() => {
    const validateFiles = async () => {
      if (downloads.length > 0) {
        await validateAndCleanupDownloads();
      }
    };
    
    validateFiles();
  }, []); // Run once when component mounts

  /**
   * Back Navigation Handler
   * 
   * Returns user to the More tab when back button is pressed.
   * Maintains proper navigation flow within the app.
   */
  // Handle back button press
  const handleGoBack = () => {
    router.push('/(tabs)/more');
  };
  
  /**
   * Download Filtering and Sorting Logic
   * 
   * Memoized computation that processes the downloads array to:
   * - Apply status-based filtering (all, completed, active)
   * - Sort by user-selected criteria (date, name, size)
   * - Maintain performance with large download lists
   * 
   * Active downloads include: downloading, pending, paused states
   * Completed downloads include: successfully finished downloads
   */
  // Filtered and sorted downloads
  const filteredDownloads = React.useMemo(() => {
    let items = [...downloads];
    
    // Apply filter
    if (filter === 'completed') {
      items = items.filter(item => item.status === 'completed');
    } else if (filter === 'active') {
      items = items.filter(item => 
        item.status === 'downloading' || 
        item.status === 'pending' ||
        item.status === 'paused'
      );
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'size') {
      items.sort((a, b) => b.size - a.size);
    } else {
      // Default sort by date, newest first
      items.sort((a, b) => b.dateAdded - a.dateAdded);
    }
    
    return items;
  }, [downloads, filter, sortBy]);
  
  /**
   * Download Playback Handler
   * 
   * Handles playing completed downloads with comprehensive error handling:
   * - Verifies file exists on device storage
   * - Navigates to streaming screen with local file path
   * - Removes broken downloads from the list
   * - Provides user feedback for errors
   * - Handles gallery-only downloads (optimized storage)
   * 
   * @param item - The download item to play
   */
  // Play a downloaded episode
  const playDownload = async (item: typeof downloads[0]) => {
    try {
      // Check if this is a gallery-only download (storage optimized)
      if (item.isInGallery && !item.filePath) {
        showCustomAlert(
          'Download Available in Gallery', 
          'This episode has been saved to your device gallery to optimize storage. Please open your gallery app and look for the "Kaizen" album to watch this episode.'
        );
        return;
      }
      
      const fileInfo = await FileSystem.getInfoAsync(item.filePath);
      
      if (fileInfo.exists) {
        // Navigate to a video player with the local file
        router.push({
          pathname: '/streaming',
          params: {
            id: item.animeId,
            localFile: item.filePath,
            title: item.title,
            episode: item.episodeNumber,
            audioType: item.audioType,
            isDownloaded: 'true'
          }
        });
      } else {
        showErrorAlert('Error', 'File not found. It may have been deleted.');
        // Remove the download from the list
        await removeDownload(item.id);
      }
    } catch (error) {
      console.error('Error playing download:', error);
      showErrorAlert('Error', 'Could not play the downloaded file');
    }
  };
  
  /**
   * Clear All Downloads Handler
   * 
   * Provides bulk deletion of all downloads with user confirmation.
   * Shows destructive action dialog to prevent accidental data loss.
   * Handles errors gracefully with user feedback.
   */
  // Confirm and clear all downloads
  const handleClearAllDownloads = () => {
    showConfirmAlert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded episodes?',
      async () => {
        try {
          await clearAllDownloads();
        } catch (error) {
          console.error('Error clearing downloads:', error);
          showErrorAlert('Error', 'Failed to clear all downloads');
        }
      },
      undefined // onCancel (default behavior)
    );
  };
  
  /**
   * Download Action Handler
   * 
   * Centralized handler for all download-related actions:
   * - play: Start playback of completed downloads
   * - pause: Pause active downloads
   * - resume: Resume paused downloads
   * - cancel: Cancel pending/active downloads with confirmation
   * - delete: Remove completed/failed downloads with confirmation
   * 
   * Includes comprehensive error handling and user confirmations for destructive actions.
   * 
   * @param item - The download item to act upon
   * @param action - The action to perform
   */
  // Handle download actions (play, pause, resume, cancel, delete)
  const handleAction = async (item: typeof downloads[0], action: string) => {
    try {
      switch (action) {
        case 'play':
          await playDownload(item);
          break;
        case 'pause':
          await pauseDownload(item.id);
          break;
        case 'resume':
          await resumeDownload(item.id);
          break;
        case 'cancel':
          showConfirmAlert(
            'Cancel Download',
            'Are you sure you want to cancel this download?',
            async () => await cancelDownload(item.id),
            undefined // onCancel (default behavior)
          );
          break;
        case 'delete':
          showConfirmAlert(
            'Delete Download',
            'Are you sure you want to delete this download?',
            async () => await removeDownload(item.id),
            undefined // onCancel (default behavior)
          );
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error(`Error with download action ${action}:`, error);
      showErrorAlert('Error', `Failed to ${action} the download`);
    }
  };
  
  /**
   * Download Item Renderer
   * 
   * Renders individual download items with:
   * - Thumbnail with status overlays
   * - Progress indicators for active downloads
   * - Episode and audio type information
   * - File size and date metadata
   * - Context-appropriate action buttons
   * - Visual feedback for different download states
   * 
   * @param item - The download item to render
   */
  // Render a download item
  const renderDownloadItem = ({ item }: { item: typeof downloads[0] }) => {
    return (
      <View style={styles.downloadItem}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => item.status === 'completed' ? playDownload(item) : null}
        >
          {/* Thumbnail with overlay for status */}
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: item.thumbnail || 'https://via.placeholder.com/100' }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            
            {/* Status overlay */}
            {item.status !== 'completed' && (
              <View style={styles.statusOverlay}>
                {item.status === 'downloading' && (
                  <>
                    <ActivityIndicator size="small" color={Colors.dark.buttonBackground} />
                    <Text style={styles.statusText}>{Math.round(item.progress * 100)}%</Text>
                  </>
                )}
                {item.status === 'pending' && (
                  <Text style={styles.statusText}>Queued</Text>
                )}
                {item.status === 'failed' && (
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#f44336" />
                )}
                {item.status === 'paused' && (
                  <MaterialCommunityIcons name="pause" size={18} color="#ffb74d" />
                )}
              </View>
            )}
            
            {/* Play Icon for completed downloads */}
            {item.status === 'completed' && (
              <View style={styles.playIconContainer}>
                {item.isInGallery ? (
                  <MaterialCommunityIcons name="folder-open" size={32} color="white" />
                ) : (
                  <MaterialCommunityIcons name="play-circle" size={32} color="white" />
                )}
              </View>
            )}
          </View>
          
          {/* Download info */}
          <View style={styles.downloadInfo}>
            <Text style={styles.downloadTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.episodeInfo}>
              Episode {item.episodeNumber} • {item.audioType === 'sub' ? 'Subbed' : 'Dubbed'}
            </Text>
            
            {/* Show different info based on status */}
            {item.status === 'completed' ? (
              <Text style={styles.downloadMeta}>
                {formatBytes(item.size)} • {format(new Date(item.dateAdded), 'MMM d, yyyy')}
                {item.isInGallery ? ' • In Gallery' : ''}
              </Text>
            ) : (
              <Text style={styles.downloadMeta}>
                {item.status === 'downloading' ? 
                  `${formatBytes(item.size * item.progress)} of ${formatBytes(item.size || 0)}` : 
                  item.status === 'paused' && item.size ? 
                    `${formatBytes(item.size * item.progress)} of ${formatBytes(item.size)}` : 
                    'Size unknown'
                } 
                • Added {formatDistanceToNow(new Date(item.dateAdded), { addSuffix: true })}
              </Text>
            )}
          </View>
          
          {/* Actions */}
          <View style={styles.actions}>
            {item.status === 'downloading' && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'pause')}
              >
                <MaterialCommunityIcons name="pause" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
            {item.status === 'paused' && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'resume')}
              >
                <MaterialCommunityIcons name="play" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
            {['downloading', 'pending', 'paused'].includes(item.status) && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'cancel')}
              >
                <MaterialCommunityIcons name="close" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
            {['completed', 'failed'].includes(item.status) && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'delete')}
              >
                <MaterialCommunityIcons name="delete" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Progress bar for downloading items */}
        {item.status === 'downloading' && (
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${item.progress * 100}%` }
              ]} 
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Header with navigation and bulk actions */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        {/* Always render the clear button container, but conditionally show the button */}
        <View style={{width: 40}}>
          {downloads.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAllDownloads}>
              <MaterialCommunityIcons name="delete" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      

      
      {/* Gallery information banner */}
      {downloads.some(d => d.status === 'completed') && (
        <View style={styles.galleryInfoBanner}>
          <MaterialCommunityIcons name="information" size={16} color={Colors.dark.buttonBackground} />
          <Text style={styles.galleryInfoText}>
            Downloaded episodes are saved to your device gallery in the "Kaizen" album for easy access
          </Text>
        </View>
      )}
      
      {/* Filtering and sorting controls */}
      <View style={styles.filtersContainer}>
        <View style={styles.filters}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]} 
            onPress={() => setFilter('all')}
          >
            <Text 
              style={[styles.filterText, filter === 'all' && styles.activeFilterText]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]} 
            onPress={() => setFilter('completed')}
          >
            <Text 
              style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}
            >
              Completed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'active' && styles.activeFilterButton]} 
            onPress={() => setFilter('active')}
          >
            <Text 
              style={[styles.filterText, filter === 'active' && styles.activeFilterText]}
            >
              Active
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Sort toggle button with cycling sort options */}
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => {
            const nextSortOptions: { [key: string]: 'date' | 'name' | 'size' } = {
              'date': 'name',
              'name': 'size',
              'size': 'date'
            };
            setSortBy(nextSortOptions[sortBy]);
          }}
        >
          <MaterialCommunityIcons 
            name={
              sortBy === 'date' ? "sort-calendar-descending" :
              sortBy === 'name' ? "sort-alphabetical-ascending" :
              "sort-numeric-descending"
            } 
            size={20} 
            color={Colors.dark.text} 
          />
          <Text style={styles.sortText}>
            {sortBy === 'date' ? "Date" : sortBy === 'name' ? "Name" : "Size"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Download list with conditional empty states */}
      {downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="download-off" 
            size={48} 
            color={Colors.dark.secondaryText} 
          />
          <Text style={styles.emptyText}>No downloads yet</Text>
        </View>
      ) : filteredDownloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="filter-remove" 
            size={48} 
            color={Colors.dark.secondaryText} 
          />
          <Text style={styles.emptyText}>No {filter} downloads found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDownloads}
          renderItem={renderDownloadItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Download queue status indicator */}
      {downloadQueue.length > 0 && (
        <View style={styles.queueInfoContainer}>
          <Text style={styles.queueInfoText}>
            {downloadQueue.length} {downloadQueue.length === 1 ? 'episode' : 'episodes'} in queue
          </Text>
        </View>
      )}
    </View>
  );
}

