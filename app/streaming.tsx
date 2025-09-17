// React hooks for state management, lifecycle, and refs
import { useEffect, useState, useRef } from 'react';

// React Native core components for UI rendering and device interaction
import { 
  View, 
  Text,
  TouchableOpacity, 
  ActivityIndicator, 
  BackHandler, 
  Image,
  Platform, 
  Modal,
  ScrollView,
  ToastAndroid,
  Share,
  Linking
} from 'react-native';

// Material Community Icons for visual elements and controls
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Expo Router hooks for navigation and parameter access
import { useLocalSearchParams, useRouter } from 'expo-router';

// Expo AV for video playback functionality
import { Video, ResizeMode } from 'expo-av';

// Status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// Custom alert components for dark-themed alerts
import { showCustomAlert, showErrorAlert, showConfirmAlert, showSuccessAlert } from '../components/CustomAlert';

// Application color constants for consistent theming
import Colors from '../constants/Colors';

// Screen orientation utilities for fullscreen support
import * as ScreenOrientation from 'expo-screen-orientation';

// Slider component for video progress control
import Slider from '@react-native-community/slider';

// File system utilities for download operations
import * as FileSystem from 'expo-file-system';

// Media library access for saved downloads
import * as MediaLibrary from 'expo-media-library';

// Downloads context for managing offline content
import { useDownloads } from '../contexts/DownloadsContext';

// Watch history context for tracking viewing progress
import { useWatchHistory } from '../contexts/WatchHistoryContext';

// Appwrite ID generation for unique download identifiers
import { ID } from 'appwrite';

// Component-specific styles
import { styles } from '../styles/streaming.styles';

/**
 * TypeScript Interfaces
 * 
 * Type definitions for video quality options and API responses
 * to ensure type safety throughout the streaming component.
 */
// Type definition for video quality options
type QualityOption = {
  label: string; // Display name (e.g., "720p", "1080p", "Auto")
  url: string;   // Streaming URL for this quality
};

// Interface for streaming API response structure
interface StreamingResponse {
  direct?: string;              // Direct streaming URL
  quality?: {                   // Available quality options
    [key: string]: string;      // Quality label mapped to URL
  };
  error?: string;               // Error message if request failed
}

/**
 * StreamingPage Component
 * 
 * Comprehensive video streaming interface that provides:
 * - High-quality video playback with custom controls
 * - Multiple quality options and playback speeds
 * - Fullscreen support with orientation handling
 * - Progress tracking and automatic resume functionality
 * - Download capability for offline viewing
 * - Watch history synchronization across devices
 * - Skip forward/backward controls (10-second intervals)
 * - Auto-hiding controls with touch interaction
 * - Share functionality for episodes
 * - Android hardware back button support
 */
export default function StreamingPage() {
  // Extract route parameters for episode information
  const params = useLocalSearchParams();
  const { id, audioType, episode, title, thumbnail } = params;
  const router = useRouter();
  
  // Core streaming state management
  const [loading, setLoading] = useState(true); // Loading state for stream URL fetch
  const [error, setError] = useState<string | null>(null); // Error state for failed requests
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null); // Current video URL
  
  // Video player state management
  const videoRef = useRef<Video | null>(null); // Reference to video player component
  const [status, setStatus] = useState<any>({}); // Current playback status from Expo AV
  const [showControls, setShowControls] = useState(true); // Control overlay visibility
  const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen mode state
  const [currentTime, setCurrentTime] = useState(0); // Current playback position (milliseconds)
  const [duration, setDuration] = useState(0); // Total video duration (milliseconds)
  const [seeking, setSeeking] = useState(false); // Whether user is actively seeking
  const [isBuffering, setIsBuffering] = useState(false); // Whether video is currently buffering
  const [showBufferingLoader, setShowBufferingLoader] = useState(false); // Whether to show buffering UI
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for buffering delay
  const [hasCreatedInitialEntry, setHasCreatedInitialEntry] = useState(false); // Whether initial watch entry was created
  const isCreatingInitialEntryRef = useRef(false); // Lock to prevent concurrent initial entry creation
  
  // Quality selection state management
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]); // Available quality options
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto'); // Currently selected quality
  const [showQualityModal, setShowQualityModal] = useState(false); // Quality selection modal visibility
  
  // Playback speed state management
  const [playbackSpeeds] = useState([0.5, 0.75, 1.0, 1.25, 1.5, 2.0]); // Available speed options
  const [selectedSpeed, setSelectedSpeed] = useState(1.0); // Currently selected playback speed
  const [showSpeedModal, setShowSpeedModal] = useState(false); // Speed selection modal visibility

  // Context integrations for downloads and watch history
  const { 
    startDownload, 
    downloadPermissionGranted, 
    requestDownloadPermissions, 
    getDownloadsByAnimeId 
  } = useDownloads();
  
  const { addToHistory, cleanupDuplicateDocuments } = useWatchHistory();
  
  // Ref for managing control auto-hide timeout
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for throttling save operations to prevent spam
  const lastSaveTimeRef = useRef<number>(0);
  
  // Ref for tracking significant position changes
  const lastSavedPositionRef = useRef<number>(0);

  /**
   * Skip Backward Function
   * 
   * Rewinds video by 10 seconds with boundary checking.
   * Ensures position doesn't go below 0.
   * Shows buffering indicator during seek operation.
   */
  // Skip backward 10 seconds
  const skipBackward = async () => {
    if (videoRef.current && status.isLoaded) {
      const newPosition = Math.max(0, currentTime - 10000);
      setShowBufferingLoader(true); // Show buffering immediately for user actions
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  /**
   * Skip Forward Function
   * 
   * Fast forwards video by 10 seconds with boundary checking.
   * Ensures position doesn't exceed video duration.
   * Shows buffering indicator during seek operation.
   */
  // Skip forward 10 seconds
  const skipForward = async () => {
    if (videoRef.current && status.isLoaded) {
      const newPosition = Math.min(duration, currentTime + 10000);
      setShowBufferingLoader(true); // Show buffering immediately for user actions
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  /**
   * Time Formatting Utility
   * 
   * Converts milliseconds to human-readable time format.
   * Supports both MM:SS and HH:MM:SS formats based on duration.
   * 
   * @param timeInMillis - Time value in milliseconds
   * @returns Formatted time string
   */
  // Format time to display as MM:SS or HH:MM:SS
  const formatTime = (timeInMillis: number) => {
    if (!timeInMillis) return '00:00';
    
    const totalSeconds = Math.floor(timeInMillis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Smart Buffering Handler
   * 
   * Implements delayed buffering indication to prevent flickering.
   * Only shows buffering UI after a threshold delay (800ms) to avoid
   * displaying loader for brief buffering events that resolve quickly.
   * 
   * @param isCurrentlyBuffering - Current buffering state from video player
   */
  const handleBufferingState = (isCurrentlyBuffering: boolean) => {
    // Clear any existing timeout
    if (bufferingTimeoutRef.current) {
      clearTimeout(bufferingTimeoutRef.current);
      bufferingTimeoutRef.current = null;
    }

    if (isCurrentlyBuffering) {
      // Start a timer - only show buffering UI after 300ms delay
      bufferingTimeoutRef.current = setTimeout(() => {
        setShowBufferingLoader(true);
      }, 300); // 300ms delay before showing buffer loader
    } else {
      // Immediately hide buffering UI when not buffering
      setShowBufferingLoader(false);
    }
    
    // Always update the raw buffering state for internal use
    setIsBuffering(isCurrentlyBuffering);
  };

  /**
   * Auto-Hide Controls Effect
   * 
   * Automatically hides video controls after 5 seconds of inactivity.
   * Prevents hiding when modals are open to maintain usability.
   * Uses timeout management to prevent memory leaks.
   */
  // Auto-hide controls after inactivity
  useEffect(() => {
    if (showControls && !showQualityModal && !showSpeedModal) {
      // Clear any existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Set a new timeout
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
      
      return () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, [showControls, showQualityModal, showSpeedModal]);

  /**
   * Fullscreen Toggle Function
   * 
   * Handles orientation changes for fullscreen video experience.
   * Locks orientation to landscape for fullscreen, portrait for normal view.
   * Updates component state to adjust UI layout accordingly.
   */
  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
  };

  /**
   * Orientation Cleanup Effect
   * 
   * Ensures orientation is reset to portrait when component unmounts.
   * Prevents orientation lock issues when navigating away from streaming.
   */
  // Reset orientation when component unmounts
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    };
  }, []);

  /**
   * Streaming URL Fetch Effect
   * 
   * Fetches video streaming URL and quality options from API on component mount.
   * Handles parameter validation, API error responses, and quality option setup.
   * Automatically loads saved playback position after successful URL fetch.
   */
  // Fetch the streaming URL and quality options when component mounts
  useEffect(() => {
    // Reset initial entry flag and lock for new episode
    setHasCreatedInitialEntry(false);
    isCreatingInitialEntryRef.current = false;
    
    const fetchStreamingUrl = async () => {
      if (!id || !audioType || !episode) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching streaming URL for anime ${id}, ${audioType}, episode ${episode}`);
        const response = await fetch(
          `https://heavenscape.vercel.app/api/anime/search/${id}/${audioType}/${episode}`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: StreamingResponse = await response.json();

        if (!data.direct) {
          throw new Error(data.error || 'No streaming URL returned');
        }

        console.log('Streaming URL fetched successfully');
        setStreamingUrl(data.direct);
        
        // Set initial buffering state when starting to load video
        setIsBuffering(true);
        
        // Set quality options if available
        const qualityOpts: QualityOption[] = [{ label: 'Auto', url: data.direct }];
        if (data.quality) {
          Object.keys(data.quality).forEach(key => {
            qualityOpts.push({ label: key, url: data.quality![key] });
          });
        }
        setQualityOptions(qualityOpts);
        
        // Clean up any duplicate documents for this episode before starting
        cleanupDuplicateDocuments(id as string, episode as string, audioType as 'sub' | 'dub');
        
        // Load saved playback position
        loadPlaybackPosition();
        
      } catch (err) {
        console.error('Error fetching streaming URL:', err);
        setError('Failed to load streaming URL. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStreamingUrl();
  }, [id, audioType, episode]);

  /**
   * Auto-Save and Cleanup Effect
   * 
   * Sets up automatic saving of playback position every 2 minutes.
   * Optimized interval to reduce Appwrite usage while maintaining functionality.
   * Handles cleanup when component unmounts to save final position.
   */
  // Set up auto-save interval and save playback position when the component unmounts
  useEffect(() => {
    // Save playback position every 2 minutes (120 seconds) to optimize cloud usage
    const autoSaveInterval = setInterval(() => {
      // Force save for interval - this is our intended 2-minute save
      savePlaybackPosition(true);
    }, 120000); // Changed from 15000ms (15s) to 120000ms (2 minutes)
    
    // Cleanup function - only runs when component unmounts
    return () => {
      clearInterval(autoSaveInterval);
      savePlaybackPosition(true); // Force save on cleanup
    };
  }, []); // Remove dependencies to prevent frequent re-runs

  /**
   * Hardware Back Button Effect
   * 
   * Handles Android hardware back button behavior:
   * - Exits fullscreen mode if currently fullscreen
   * - Saves playback position before navigation
   * - Navigates back to previous screen
   */
  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        toggleFullscreen();
        return true;
      }
      
      // Save playback position before navigating back
      savePlaybackPosition(true); // Force save on navigation
      router.back();
      return true;
    });

    return () => backHandler.remove();
  }, [router, isFullscreen, currentTime]);

  /**
   * Cleanup Effect
   * 
   * Cleans up timers and resources when component unmounts
   * to prevent memory leaks and unnecessary operations.
   */
  useEffect(() => {
    return () => {
      // Clean up buffering timeout
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      // Clean up controls timeout (handled by existing effect but good to be safe)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Get the watch history context
  const { getWatchedEpisodes } = useWatchHistory();
  
  /**
   * Load Playback Position Function
   * 
   * Retrieves saved watch progress from cloud history and offers resume option.
   * Checks watch history for matching episode and audio type.
   * Shows resume dialog for significant progress (>30 seconds).
   * Automatically seeks to saved position if user chooses to resume.
   */
  // Load saved playback position from cloud history
  const loadPlaybackPosition = async () => {
    try {
      // Check if we have this episode in watch history
      const watchedEpisodes = getWatchedEpisodes(id as string);
      const watchedEpisode = watchedEpisodes.find(ep => 
        ep.episodeNumber === episode && 
        ep.audioType === (audioType as 'sub' | 'dub')
      );
      
      let position = 0;
      let foundPosition = false;
      
      // If found in watch history (cloud or local), use that position
      if (watchedEpisode && watchedEpisode.position) {
        position = watchedEpisode.position;
        foundPosition = true;
        console.log(`Found watch history position for ${id} episode ${episode}: ${position}ms`);
      } 
      
      // If we found a position and it's significant enough, ask to resume
      if (foundPosition && position > 30000) { // Only ask if more than 30 seconds in
        showConfirmAlert(
          "Resume Playback",
          "Do you want to continue where you left off?",
          async () => {
            // Resume
            if (videoRef.current) {
              await videoRef.current.setPositionAsync(position);
            }
          },
          undefined // Start Over (default behavior - do nothing)
        );
      }
    } catch (err) {
      console.error('Error loading playback position:', err);
    }
  };

  /**
   * Save Playback Position Function
   * 
   * Saves current playback progress to cloud watch history.
   * Records position and duration for accurate resume functionality.
   * Uses low threshold (5%) to track progress from early viewing.
   * Handles errors gracefully to prevent streaming interruption.
   */
  // Save current playback position to cloud watch history (with smart throttling)
  const savePlaybackPosition = async (force: boolean = false) => {
    try {
      // Smart throttling: allow manual saves every 10 seconds, but forced saves bypass entirely
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimeRef.current;
      const isInitialSave = lastSaveTimeRef.current === 0;
      
      // Only throttle non-forced saves, and allow more frequent saves (10 seconds)
      if (timeSinceLastSave < 10000 && !isInitialSave && !force) {
        console.log(`Skipping save - too soon (${Math.floor(timeSinceLastSave / 1000)}s since last save)`);
        return;
      }
      
      if (currentTime > 0 && duration > 0) {
        // Update timestamp for all successful saves
        lastSaveTimeRef.current = now;
        // Update the watch history in cloud storage
        // Lower the threshold to consider watched if at least 5% of the episode is watched
        // This ensures more consistent history recording
        const watchedThreshold = duration * 0.05;
        
        // Always add to history with current position, even if below threshold
        // This allows tracking progress from the beginning
        await addToHistory({
          id: id as string, 
          episodeNumber: episode as string,
          audioType: audioType as 'sub' | 'dub',
          englishName: title as string || 'Unknown Anime',
          thumbnailUrl: thumbnail as string || '',
          position: Math.floor(currentTime), // Convert to integer (milliseconds)
          duration: Math.floor(duration)     // Convert to integer (milliseconds)
        });
        
        // Update the last saved position reference
        lastSavedPositionRef.current = currentTime;
        
        // Log that we've saved watch history (for debugging)
        console.log(`Saved watch history: ${id}, ep ${episode}, position: ${Math.floor(currentTime)}ms / ${Math.floor(duration)}ms`);
      }
    } catch (err) {
      console.error('Error saving playback position:', err);
    }
  };

  /**
   * Create Initial Watch History Entry
   * 
   * Creates an immediate watch history entry when episode starts playing.
   * This ensures the episode is tracked even if user stops watching quickly.
   * Only runs once per episode to avoid duplicates.
   */
  const createInitialWatchEntry = async () => {
    // Prevent concurrent executions with ref-based lock
    if (hasCreatedInitialEntry || isCreatingInitialEntryRef.current || !duration || !id || !episode) return;
    
    // Set lock immediately to prevent race conditions
    isCreatingInitialEntryRef.current = true;
    
    try {
      console.log(`Creating initial watch history entry for: ${id}, ep ${episode}`);
      
      await addToHistory({
        id: id as string, 
        episodeNumber: episode as string,
        audioType: audioType as 'sub' | 'dub',
        englishName: title as string || 'Unknown Anime',
        thumbnailUrl: thumbnail as string || '',
        position: Math.max(0, Math.floor(currentTime)), // Start from current position (could be resume point)
        duration: Math.floor(duration)
      });
      
      setHasCreatedInitialEntry(true);
      lastSavedPositionRef.current = currentTime;
      
      console.log(`Initial watch history entry created: ${id}, ep ${episode}`);
    } catch (err) {
      console.error('Error creating initial watch entry:', err);
    } finally {
      // Always release the lock, even if there was an error
      isCreatingInitialEntryRef.current = false;
    }
  };

  /**
   * Back Navigation Handler
   * 
   * Handles manual back navigation with progress saving.
   * Ensures watch progress is preserved before leaving streaming screen.
   */
  const handleGoBack = () => {
    // Save playback position before navigating back
    savePlaybackPosition();
    router.back();
  };

  /**
   * Playback Status Update Handler
   * 
   * Processes video playback status updates from Expo AV.
   * Updates current time and duration state.
   * Handles buffering state for smooth user experience.
   * Triggers automatic save for significant progress changes.
   * Handles video completion events for final progress save.
   */
  // Handle video playback status updates
  const onPlaybackStatusUpdate = (status: any) => {
    setStatus(status);
    
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis);
      setDuration(status.durationMillis);
      
      // Handle buffering state - use smart buffering with delay
      if (status.isBuffering !== undefined) {
        handleBufferingState(status.isBuffering);
      }
      
      // Create initial watch history entry when playback starts and duration is available
      if (status.durationMillis > 0 && !hasCreatedInitialEntry) {
        createInitialWatchEntry();
      }
      
      // Save on video completion
      const isPlaybackFinished = status.isLoaded && 'didJustFinish' in status && status.didJustFinish === true;
      
      // Save on significant position changes (like seeking or after long pause)
      const currentPos = status.positionMillis || 0;
      const positionDifference = Math.abs(currentPos - lastSavedPositionRef.current);
      const significantPositionChange = positionDifference > 30000; // 30 seconds difference
      
      // Save on pause/stop after significant playback
      const hasStoppedAfterProgress = !status.isPlaying && currentPos > 30000 && positionDifference > 10000;
      
      if (isPlaybackFinished) {
        console.log("Saving watch history due to video completion");
        savePlaybackPosition(true); // Force save on completion
      } else if (significantPositionChange && currentPos > 10000) {
        console.log("Saving watch history due to significant position change");
        lastSavedPositionRef.current = currentPos;
        savePlaybackPosition(); // Regular save for position changes
      } else if (hasStoppedAfterProgress) {
        console.log("Saving watch history due to pause after progress");
        lastSavedPositionRef.current = currentPos;
        savePlaybackPosition(); // Regular save for pause
      }
    } else {
      // If video is not loaded, it might be buffering
      handleBufferingState(true);
    }
  };

  /**
   * Play/Pause Toggle Function
   * 
   * Toggles video playback state between playing and paused.
   * Uses Expo AV's async play/pause methods for smooth control.
   */
  // Toggle play/pause
  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  /**
   * Video Seeking Handler
   * 
   * Handles programmatic seeking to specific video position.
   * Sets seeking state to prevent UI conflicts during seek operation.
   * Shows buffering state during seek for better user feedback.
   * 
   * @param value - Target position in milliseconds
   */
  // Handle video seeking
  const handleSeek = async (value: number) => {
    if (videoRef.current) {
      setSeeking(true);
      setShowBufferingLoader(true); // Show buffering immediately for user actions
      try {
        await videoRef.current.setPositionAsync(value);
      } catch (err) {
        console.error('Error seeking video:', err);
      } finally {
        setSeeking(false);
        // Note: buffering state will be updated by onPlaybackStatusUpdate
      }
    }
  };

  /**
   * Slider Seeking Handler
   * 
   * Handles real-time position updates during slider dragging.
   * Updates current time state without affecting video position.
   * Used for smooth slider interaction feedback.
   * 
   * @param value - New position value from slider
   */
  // Handle slider seeking (when user is actively dragging the slider)
  const handleSeeking = (value: number) => {
    setCurrentTime(value);
  };

  /**
   * Quality Change Function
   * 
   * Changes video quality by switching streaming URL.
   * Preserves playback position and playing state during quality change.
   * Handles URL update and automatic seeking to previous position.
   * 
   * @param quality - Selected quality option with label and URL
   */
  /**
   * Quality Change Handler
   * 
   * Switches video quality while preserving playback position and state.
   * Handles smooth quality transitions with buffering indication.
   * Automatically seeks to previous position after quality change.
   * 
   * @param quality - Target quality option with label and URL
   */
  // Change video quality
  const changeQuality = async (quality: QualityOption) => {
    try {
      if (videoRef.current && quality.url !== streamingUrl) {
        // Remember the current position and playing state
        const currentPosition = status.positionMillis;
        const wasPlaying = status.isPlaying;
        
        // Show buffering indicator during quality change
        setIsBuffering(true);
        
        // Update the streaming URL
        setStreamingUrl(quality.url);
        setSelectedQuality(quality.label);
        
        // The video will reload automatically since the source is changing
        // Once loaded, we'll seek to the previous position
        const waitForLoad = () => {
          if (videoRef.current) {
            videoRef.current.setPositionAsync(currentPosition)
              .then(() => {
                if (wasPlaying) {
                  videoRef.current?.playAsync();
                }
              });
          }
        };
        
        // Give a small delay to ensure the video has loaded with the new source
        setTimeout(waitForLoad, 1000);
      }
    } catch (err) {
      console.error('Error changing quality:', err);
      showErrorAlert('Error', 'Failed to change video quality');
    } finally {
      setShowQualityModal(false);
    }
  };  /**
   * Playback Speed Change Function
   * 
   * Changes video playback speed using Expo AV's rate control.
   * Updates selected speed state and closes speed selection modal.
   * 
   * @param speed - Target playback speed multiplier
   */
  // Change playback speed
  const changePlaybackSpeed = async (speed: number) => {
    try {
      if (videoRef.current) {
        await videoRef.current.setRateAsync(speed, true);
        setSelectedSpeed(speed);
        setShowSpeedModal(false);
      }
    } catch (err) {
      console.error('Error changing playback speed:', err);
      showErrorAlert('Error', 'Failed to change playback speed');
    }
  };

  /**
   * Download Process Initiator
   * 
   * Handles episode download with comprehensive permission and confirmation flow:
   * - Validates streaming URL availability
   * - Requests storage permissions if needed
   * - Shows confirmation dialog with episode details
   * - Initiates download through context with unique ID
   * - Provides user feedback on success/failure
   */
  /**
   * Download Method Selection Handler
   * 
   * Shows dialog to let user choose between in-app and browser downloads:
   * - In-App Download: Downloads to device storage via app
   * - Browser Download: Opens download in default browser
   * - Validates streaming URL availability
   * - Provides user choice for download method preference
   */
  // Show download method selection dialog
  const showDownloadMethodDialog = () => {
    if (!streamingUrl) {
      showErrorAlert('Error', 'No video URL available to download');
      return;
    }

    const episodeTitle = title ? `${title} - Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})` : `Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})`;
    
    showCustomAlert(
      'Choose Download Method',
      `How would you like to download ${episodeTitle}?`,
      [
        {
          text: 'In-App',
          style: 'default',
          onPress: () => startAppDownload()
        },
        {
          text: 'Browser',
          style: 'default',
          onPress: () => startBrowserDownload()
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {}
        }
      ]
    );
  };

  /**
   * In-App Download Process
   * 
   * Handles downloading through the app's download manager:
   * - Validates streaming URL availability
   * - Requests storage permissions if needed
   * - Shows confirmation dialog with episode details
   * - Initiates download through context with unique ID
   * - Provides user feedback on success/failure
   */
  // Start in-app download process
  const startAppDownload = async () => {
    // First check permissions
    if (!downloadPermissionGranted) {
      const granted = await requestDownloadPermissions();
      if (!granted) {
        showErrorAlert('Permission Required', 'Storage permission is required to download videos');
        return;
      }
    }

    const episodeTitle = title ? `${title} - Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})` : `Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})`;
    
    try {
      // Generate a unique ID for this download
      const downloadId = ID.unique();
      
      await startDownload({
        id: downloadId,
        animeId: id as string,
        episodeNumber: episode as string,
        audioType: audioType as 'sub' | 'dub',
        title: episodeTitle,
        downloadUrl: streamingUrl!,
        thumbnail: '',
      });
      
      showSuccessAlert('Download Started', `${episodeTitle} has been added to your downloads`);
    } catch (error) {
      console.error('Download error:', error);
      showErrorAlert('Download Failed', 'There was an error starting the download. Please try again.');
    }
  };

  /**
   * Browser Download Process
   * 
   * Opens the video URL in the device's default browser for download:
   * - Opens streaming URL in external browser
   * - Browser handles download management
   * - No storage permissions needed
   * - Uses device's default download manager
   */
  // Start browser download process
  const startBrowserDownload = async () => {
    try {
      const supported = await Linking.canOpenURL(streamingUrl!);
      
      if (supported) {
        await Linking.openURL(streamingUrl!);
        const episodeTitle = title ? `${title} - Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})` : `Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})`;
        showSuccessAlert(
          'Browser Download Started', 
          `${episodeTitle} has been opened in your browser. You can manage the download from there.`
        );
      } else {
        showErrorAlert('Error', 'Cannot open video URL in browser');
      }
    } catch (error) {
      console.error('Browser download error:', error);
      showErrorAlert('Browser Download Failed', 'There was an error opening the download in browser. Please try again.');
    }
  };

  /**
   * Legacy Download Process (Deprecated)
   * 
   * Kept for backwards compatibility - now redirects to method selection
   */
  // Request media library permission and start download
  const startDownloadProcess = async () => {
    // Redirect to new download method selection
    showDownloadMethodDialog();
  };  /**
   * Share Video Function
   * 
   * Opens native share dialog with episode information.
   * Shares episode title and streaming URL when available.
   * Handles share errors gracefully without interrupting playback.
   */
  // Share the video link
  const shareVideo = async () => {
    try {
      await Share.share({
        message: `Check out ${title ? title + ' - ' : ''}Episode ${episode} on Kaizen!`,
        url: streamingUrl || ''
      });
    } catch (err) {
      console.error('Error sharing video:', err);
    }
  };

  return (
    <View style={[
      styles.container, 
      isFullscreen && styles.fullscreenContainer
    ]}>
      <StatusBar style="light" translucent={true} hidden={isFullscreen} />

      {/* Header - hidden in fullscreen mode */}
      {!isFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title ? `${title}` : 'Episode'} {episode}
          </Text>
          <TouchableOpacity style={styles.shareButton} onPress={shareVideo}>
            <MaterialCommunityIcons name="share-variant" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main video content area with touch interaction for control toggle */}
      <TouchableOpacity 
        activeOpacity={1}
        style={styles.videoContainer}
        onPress={() => setShowControls(!showControls)}
      >
        {loading ? (
          // Loading state with spinner and message
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
            <Text style={styles.loadingText}>Loading stream...</Text>
          </View>
        ) : error ? (
          // Error state with retry option
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.dark.buttonBackground} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.replace({ pathname: '/streaming', params: params })}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Main video player container
          <View style={styles.playerContainer}>
            {streamingUrl ? (
              <>
                {/* Expo AV Video component with custom controls disabled */}
                <Video
                  ref={videoRef}
                  source={{ uri: streamingUrl }}
                  rate={selectedSpeed}
                  shouldPlay={false}
                  isLooping={false}
                  resizeMode={ResizeMode.CONTAIN}
                  style={styles.video}
                  onPlaybackStatusUpdate={(status) => {
                    // First, call the original handler to update state
                    onPlaybackStatusUpdate(status);
                    
                    // Then check specifically if video has just finished
                    if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish && duration > 0) {
                      // Save watch history when video completes
                      savePlaybackPosition(true); // Force save on completion
                    }
                  }}
                  useNativeControls={false}
                  posterSource={{ uri: thumbnail as string }}
                  usePoster={true}
                  posterStyle={styles.poster}
                />
                
                {/* Buffering loader overlay - integrated into the video player */}
                {showBufferingLoader && (
                  <View style={styles.bufferingOverlay}>
                    <ActivityIndicator 
                      size="large" 
                      color={Colors.dark.buttonBackground} 
                    />
                  </View>
                )}
                
                {/* Custom controls overlay with conditional visibility */}
                {showControls && (
                  <View style={styles.controlsOverlay}>
                    {/* Top controls bar - title and navigation in fullscreen */}
                    <View style={styles.topControlsBar}>
                      {isFullscreen && (
                        <TouchableOpacity style={styles.topButton} onPress={handleGoBack}>
                          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
                        </TouchableOpacity>
                      )}
                      <Text style={styles.videoTitle} numberOfLines={1}>
                        {title ? `${title} - ` : ''}Episode {episode} ({audioType === 'sub' ? 'Subbed' : 'Dubbed'})
                      </Text>
                      {isFullscreen && (
                        <TouchableOpacity style={styles.topButton} onPress={shareVideo}>
                          <MaterialCommunityIcons name="share-variant" size={24} color="white" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Center controls for better player experience */}
                    <View style={styles.centerControlsContainer}>
                      {/* Backward 10s button */}
                      <TouchableOpacity 
                        style={styles.centerControlButton} 
                        onPress={skipBackward}
                      >
                        <MaterialCommunityIcons 
                          name="rewind-10" 
                          size={36} 
                          color="white" 
                        />
                      </TouchableOpacity>
                      
                      <View style={styles.centerButtonSpacer} />
                      <View style={styles.centerButtonSpacer} />
                      
                      {/* Center play/pause button */}
                      <TouchableOpacity 
                        style={styles.centerButton} 
                        onPress={togglePlayPause}
                      >
                        <MaterialCommunityIcons 
                          name={status.isPlaying ? "pause" : "play"} 
                          size={50} 
                          color="white" 
                        />
                      </TouchableOpacity>
                      
                      <View style={styles.centerButtonSpacer} />
                      <View style={styles.centerButtonSpacer} />
                      
                      {/* Forward 10s button */}
                      <TouchableOpacity 
                        style={styles.centerControlButton} 
                        onPress={skipForward}
                      >
                        <MaterialCommunityIcons 
                          name="fast-forward-10" 
                          size={36} 
                          color="white" 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Bottom controls bar with progress and action buttons */}
                    <View style={styles.bottomControlsBar}>
                      {/* Progress slider and timestamps */}
                      <View style={styles.progressContainer}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <Slider
                          style={styles.progressSlider}
                          minimumValue={0}
                          maximumValue={duration || 1}
                          value={seeking ? currentTime : (status.positionMillis || 0)}
                          onValueChange={handleSeeking}
                          onSlidingComplete={handleSeek}
                          minimumTrackTintColor={Colors.dark.buttonBackground}
                          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                          thumbTintColor={Colors.dark.buttonBackground}
                        />
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                      </View>
                      
                      {/* Bottom buttons row with all video controls */}
                      <View style={styles.bottomButtonsRow}>
                        {/* Play/Pause button */}
                        <TouchableOpacity 
                          style={styles.controlButton} 
                          onPress={togglePlayPause}
                        >
                          <MaterialCommunityIcons 
                            name={status.isPlaying ? "pause" : "play"} 
                            size={24} 
                            color="white" 
                          />
                        </TouchableOpacity>
                        
                        {/* Playback speed button */}
                        <TouchableOpacity 
                          style={styles.controlButton} 
                          onPress={() => setShowSpeedModal(true)}
                        >
                          <MaterialCommunityIcons name="fast-forward" size={24} color="white" />
                          <Text style={styles.buttonLabel}>{selectedSpeed}x</Text>
                        </TouchableOpacity>
                        
                        {/* Quality selection button - conditional on available options */}
                        {qualityOptions.length > 1 && (
                          <TouchableOpacity 
                            style={styles.controlButton} 
                            onPress={() => setShowQualityModal(true)}
                          >
                            <MaterialCommunityIcons name="quality-high" size={24} color="white" />
                            <Text style={styles.buttonLabel}>{selectedQuality}</Text>
                          </TouchableOpacity>
                        )}
                        
                        {/* Download button */}
                        <TouchableOpacity 
                          style={styles.controlButton} 
                          onPress={startDownloadProcess}
                        >
                          <MaterialCommunityIcons name="download" size={24} color="white" />
                        </TouchableOpacity>
                        
                        {/* Fullscreen toggle button */}
                        <TouchableOpacity 
                          style={styles.controlButton} 
                          onPress={toggleFullscreen}
                        >
                          <MaterialCommunityIcons 
                            name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                            size={24} 
                            color="white" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              // Fallback thumbnail container when no streaming URL
              <View style={styles.thumbnailContainer}>
                {thumbnail ? (
                  <Image 
                    source={{ uri: thumbnail as string }} 
                    style={styles.thumbnail} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <MaterialCommunityIcons name="video-off" size={48} color={Colors.dark.secondaryText} />
                    <Text style={styles.placeholderText}>Video preview not available</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Quality selection modal with scrollable options */}
      <Modal
        visible={showQualityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowQualityModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Quality</Text>
            <ScrollView style={styles.modalScrollView}>
              {qualityOptions.map((quality, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.modalItem,
                    selectedQuality === quality.label && styles.selectedModalItem
                  ]}
                  onPress={() => changeQuality(quality)}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedQuality === quality.label && styles.selectedModalItemText
                  ]}>
                    {quality.label}
                  </Text>
                  {selectedQuality === quality.label && (
                    <MaterialCommunityIcons name="check" size={20} color={Colors.dark.buttonBackground} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowQualityModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Speed selection modal with predefined speed options */}
      <Modal
        visible={showSpeedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSpeedModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowSpeedModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Playback Speed</Text>
            <ScrollView style={styles.modalScrollView}>
              {playbackSpeeds.map((speed, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.modalItem,
                    selectedSpeed === speed && styles.selectedModalItem
                  ]}
                  onPress={() => changePlaybackSpeed(speed)}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedSpeed === speed && styles.selectedModalItemText
                  ]}>
                    {speed}x
                  </Text>
                  {selectedSpeed === speed && (
                    <MaterialCommunityIcons name="check" size={20} color={Colors.dark.buttonBackground} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowSpeedModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}