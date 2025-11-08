// React hooks for state management, lifecycle, reducers, and refs
import { useEffect, useState, useRef, useReducer } from 'react';

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
  ToastAndroid,
  Share,
  Linking,
  useWindowDimensions
} from 'react-native';

import { Video, ResizeMode } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { showCustomAlert, showErrorAlert, showConfirmAlert, showSuccessAlert } from '../components/CustomAlert';
import Colors from '../constants/Colors';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import { useDownloads } from '../contexts/DownloadsContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';
import { ID } from 'appwrite';
import { styles } from '../styles/streaming.styles';

/**
 * TypeScript Interfaces
 * 
 * Type definitions for streaming API responses
 * to ensure type safety throughout the streaming component.
 */
// Interface for streaming API response structure
interface StreamingResponse {
  direct?: string;              // Direct streaming URL
  episodes?: {                  // Available episodes from API
    sub: string[];              // Available sub episodes
    dub: string[];              // Available dub episodes
  };
  error?: string;               // Error message if request failed
}

type PlayerUiState = {
  showControls: boolean;
  isFullscreen: boolean;
  showBufferingLoader: boolean;
  seeking: boolean;
  showSpeedModal: boolean;
};

type StreamState = {
  episodes: string[];
  currentEpisodeIndex: number;
  loading: boolean;
  error: string | null;
  streamingUrl: string | null;
};

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

interface StreamingResponse {
  direct?: string;
  episodes?: {
    sub: string[];
    dub: string[];
  };
  error?: string;
}

/**
 * StreamingPage Component
 * 
 * Comprehensive video streaming interface that provides:
 * - High-quality video playback with custom controls
 * - Custom playback speeds with persistent settings
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
  
  const [streamState, patchStreamState] = useReducer(
    (state: StreamState, action: Partial<StreamState>) => ({ ...state, ...action }),
    {
      episodes: [],
      currentEpisodeIndex: 0,
      loading: true,
      error: null,
      streamingUrl: null
    }
  );

  const { episodes, currentEpisodeIndex, loading, error, streamingUrl } = streamState;
  
  // Video player state management
  const videoRef = useRef<Video | null>(null); // Reference to video player component
  const [status, setStatus] = useState<any>({}); // Current playback status from Expo AV
  const [currentTime, setCurrentTime] = useState(0); // Current playback position (milliseconds)
  const [duration, setDuration] = useState(0); // Total video duration (milliseconds)

  const [selectedSpeed, setSelectedSpeed] = useState<PlaybackSpeed>(1.0); // Currently selected playback speed

  const [playerUi, patchPlayerUi] = useReducer(
    (state: PlayerUiState, action: Partial<PlayerUiState>) => ({ ...state, ...action }),
    {
      showControls: true,
      isFullscreen: false,
      showBufferingLoader: false,
      seeking: false,
      showSpeedModal: false
    }
  );

  const { showControls, isFullscreen, showBufferingLoader, seeking, showSpeedModal } = playerUi;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for buffering delay
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for auto-hiding controls
  const hasCreatedInitialEntryRef = useRef(false); // Whether initial watch entry was created
  const isCreatingInitialEntryRef = useRef(false); // Lock to prevent concurrent initial entry creation

  // Context integrations for downloads and watch history
  const { 
    startDownload, 
    downloadPermissionGranted, 
    requestDownloadPermissions
  } = useDownloads();
  
  const { addToHistory, cleanupDuplicateDocuments } = useWatchHistory();
  
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
      patchPlayerUi({ showBufferingLoader: true }); // Show buffering immediately for user actions
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
      patchPlayerUi({ showBufferingLoader: true }); // Show buffering immediately for user actions
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
   * Episode Navigation Functions
   * 
   * Handle previous and next episode navigation with boundary checking.
   * Saves current progress before switching episodes and navigates to new episode.
   */

  /**
   * Navigate to Previous Episode
   * 
   * Switches to the previous episode in the episode list.
   * Saves current progress before navigation and includes boundary checking.
   */
  const goToPreviousEpisode = async () => {
    if (currentEpisodeIndex > 0 && episodes.length > 1) {
      // Save current progress before switching episodes
      await savePlaybackPosition(true);
      
      const previousEpisode = episodes[currentEpisodeIndex - 1];
      
      // Show feedback to user
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Fetching Episode ${previousEpisode}`, ToastAndroid.SHORT);
      }
      
      // Navigate to previous episode
      router.replace({
        pathname: '/streaming',
        params: {
          id: id,
          audioType: audioType,
          episode: previousEpisode,
          title: title,
          thumbnail: thumbnail
        }
      });
    }
  };

  /**
   * Navigate to Next Episode
   * 
   * Switches to the next episode in the episode list.
   * Saves current progress before navigation and includes boundary checking.
   */
  const goToNextEpisode = async () => {
    if (currentEpisodeIndex < episodes.length - 1 && episodes.length > 1) {
      // Save current progress before switching episodes
      await savePlaybackPosition(true);
      
      const nextEpisode = episodes[currentEpisodeIndex + 1];
      
      // Show feedback to user
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Fetching Episode ${nextEpisode}`, ToastAndroid.SHORT);
      }
      
      // Navigate to next episode
      router.replace({
        pathname: '/streaming',
        params: {
          id: id,
          audioType: audioType,
          episode: nextEpisode,
          title: title,
          thumbnail: thumbnail
        }
      });
    }
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
        patchPlayerUi({ showBufferingLoader: true });
      }, 300); // 300ms delay before showing buffer loader
    } else {
      // Immediately hide buffering UI when not buffering
      patchPlayerUi({ showBufferingLoader: false });
    }
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
    if (showControls && !showSpeedModal) {
      // Clear any existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Set a new timeout
      controlsTimeoutRef.current = setTimeout(() => {
        patchPlayerUi({ showControls: false });
      }, 5000);
      
      return () => {
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, [showControls, showSpeedModal]);

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
      patchPlayerUi({ isFullscreen: false });
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      patchPlayerUi({ isFullscreen: true });
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
  * Fetches video streaming URL and episode list from API on component mount.
  * Handles parameter validation, API error responses, and episode list setup.
   * Automatically loads saved playback position after successful URL fetch.
   */
  // Fetch the streaming URL and episodes when component mounts
  useEffect(() => {
    // Reset initial entry flag and lock for new episode
  hasCreatedInitialEntryRef.current = false;
    isCreatingInitialEntryRef.current = false;
    patchStreamState({ loading: true, error: null, streamingUrl: null });
    
    const fetchStreamingUrl = async () => {
      if (!id || !audioType || !episode) {
        patchStreamState({
          error: 'Missing required parameters',
          loading: false
        });
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
        patchStreamState({ streamingUrl: data.direct });
        
        // Process episode list from API response
        if (data.episodes && data.episodes[audioType as 'sub' | 'dub']) {
          const apiEpisodes = data.episodes[audioType as 'sub' | 'dub'];
          patchStreamState({ episodes: apiEpisodes });
          
          // Find current episode index
          const currentIndex = apiEpisodes.findIndex((ep: string) => ep === episode);
          patchStreamState({ currentEpisodeIndex: currentIndex >= 0 ? currentIndex : 0 });
          
          console.log(`Loaded ${apiEpisodes.length} episodes from API for ${audioType}`);
        } else {
          // Fallback: single episode if no episode list in API response
          patchStreamState({ episodes: [episode as string], currentEpisodeIndex: 0 });
          console.log('No episode list in API response, using single episode');
        }
        
        // Set initial buffering state when starting to load video
        handleBufferingState(true);
        
        // Clean up any duplicate documents for this episode before starting
        cleanupDuplicateDocuments(id as string, episode as string, audioType as 'sub' | 'dub');
        
        // Load saved playback position
        loadPlaybackPosition();
        
      } catch (err) {
        console.error('Error fetching streaming URL:', err);
        patchStreamState({ error: 'Failed to load streaming URL. Please try again.' });
      } finally {
        patchStreamState({ loading: false });
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
  const watchedEpisode = watchedEpisodes.find((ep) => 
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
  if (hasCreatedInitialEntryRef.current || isCreatingInitialEntryRef.current || !duration || !id || !episode) return;
    
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
      
  hasCreatedInitialEntryRef.current = true;
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
  if (status.durationMillis > 0 && !hasCreatedInitialEntryRef.current) {
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
      patchPlayerUi({ seeking: true, showBufferingLoader: true }); // Show buffering immediately for user actions
      try {
        await videoRef.current.setPositionAsync(value);
      } catch (err) {
        console.error('Error seeking video:', err);
      } finally {
        patchPlayerUi({ seeking: false });
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
   * Playback Speed Change Function
   * 
   * Changes video playback speed using Expo AV's rate control.
   * Updates selected speed state and closes speed selection modal.
   * 
   * @param speed - Target playback speed multiplier
   */
  // Change playback speed
  const changePlaybackSpeed = async (speed: PlaybackSpeed) => {
    try {
      if (videoRef.current) {
        await videoRef.current.setRateAsync(speed, true);
        setSelectedSpeed(speed);
        patchPlayerUi({ showSpeedModal: false });
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

  /**
   * Render Playback Speed Grid
   *
   * Compact, orientation-aware speed selector that mirrors native video players.
   */
  const renderSpeedGrid = () => {
    const optionWidthStyle = isLandscape ? styles.speedChipLandscape : styles.speedChipPortrait;
    const containerStyle = [
      styles.speedGridContainer,
      isLandscape && styles.speedGridContainerLandscape
    ];

    return (
      <View style={containerStyle}>
        {PLAYBACK_SPEEDS.map((speed) => {
          const isSelected = selectedSpeed === speed;
          return (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedChip,
                optionWidthStyle,
                isSelected && styles.selectedSpeedGridItem
              ]}
              onPress={() => changePlaybackSpeed(speed)}
            >
              <Text style={[
                styles.speedChipText,
                isSelected && styles.selectedSpeedGridItemText
              ]}>
                {speed}x
              </Text>
              {isSelected && (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={Colors.dark.buttonBackground}
                  style={styles.speedChipIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
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
            {episodes.length > 1 && (
              <Text style={styles.episodeCounter}> ({currentEpisodeIndex + 1}/{episodes.length})</Text>
            )}
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
        onPress={() => patchPlayerUi({ showControls: !showControls })}
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
                    
                    {/* Restructured center controls - single row for better landscape experience */}
                    <View style={styles.centerControlsContainer}>
                      <View style={styles.allControlsRow}>
                        {/* Previous Episode button - only show if available */}
                        {episodes.length > 1 && (
                          <TouchableOpacity 
                            style={[
                              styles.controlIcon,
                              currentEpisodeIndex <= 0 && styles.disabledButton
                            ]}
                            onPress={goToPreviousEpisode}
                            disabled={currentEpisodeIndex <= 0}
                          >
                            <MaterialCommunityIcons 
                              name="skip-previous" 
                              size={28} 
                              color={currentEpisodeIndex <= 0 ? "rgba(255, 255, 255, 0.3)" : "white"}
                            />
                          </TouchableOpacity>
                        )}
                        
                        {/* Backward 10s button */}
                        <TouchableOpacity 
                          style={styles.controlIcon} 
                          onPress={skipBackward}
                        >
                          <MaterialCommunityIcons 
                            name="rewind-10" 
                            size={28} 
                            color="white" 
                          />
                        </TouchableOpacity>
                        
                        {/* Center play/pause button */}
                        <TouchableOpacity 
                          style={styles.playPauseIcon} 
                          onPress={togglePlayPause}
                        >
                          <MaterialCommunityIcons 
                            name={status.isPlaying ? "pause" : "play"} 
                            size={42} 
                            color="white" 
                          />
                        </TouchableOpacity>
                        
                        {/* Forward 10s button */}
                        <TouchableOpacity 
                          style={styles.controlIcon} 
                          onPress={skipForward}
                        >
                          <MaterialCommunityIcons 
                            name="fast-forward-10" 
                            size={28} 
                            color="white" 
                          />
                        </TouchableOpacity>
                        
                        {/* Next Episode button - only show if available */}
                        {episodes.length > 1 && (
                          <TouchableOpacity 
                            style={[
                              styles.controlIcon,
                              currentEpisodeIndex >= episodes.length - 1 && styles.disabledButton
                            ]}
                            onPress={goToNextEpisode}
                            disabled={currentEpisodeIndex >= episodes.length - 1}
                          >
                            <MaterialCommunityIcons 
                              name="skip-next" 
                              size={28} 
                              color={currentEpisodeIndex >= episodes.length - 1 ? "rgba(255, 255, 255, 0.3)" : "white"}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    {/* Bottom controls bar with progress and action buttons */}
                    <View style={styles.bottomControlsBar}>
                      {/* Progress slider and timestamps */}
                      <View style={styles.progressContainer}>
                        <Text style={[styles.timeText, styles.timeLabel]}>{formatTime(currentTime)}</Text>
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
                        <Text style={[styles.timeText, styles.timeLabel, styles.timeLabelRight]}>{formatTime(duration)}</Text>
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
                          onPress={() => patchPlayerUi({ showSpeedModal: true })}
                        >
                          <MaterialCommunityIcons name="fast-forward" size={24} color="white" />
                          <Text style={styles.buttonLabel}>{selectedSpeed}x</Text>
                        </TouchableOpacity>
                        
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

      {/* Speed selection modal with predefined speed options */}
      <Modal
        visible={showSpeedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => patchPlayerUi({ showSpeedModal: false })}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => patchPlayerUi({ showSpeedModal: false })}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {renderSpeedGrid()}
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => patchPlayerUi({ showSpeedModal: false })}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}