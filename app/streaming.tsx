import { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text,
  TouchableOpacity, 
  ActivityIndicator, 
  BackHandler, 
  Image,
  Platform, 
  Alert,
  Modal,
  ScrollView,
  ToastAndroid,
  Share
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import Colors from '../constants/Colors';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDownloads } from '../contexts/DownloadsContext';
import { useWatchHistory } from '../contexts/WatchHistoryContext';
import { ID } from 'appwrite';

import { styles } from '../styles/streaming.styles';

// filepath: /home/risersama/projects/kaizen-app/app/streaming.tsx
type QualityOption = {
  label: string;
  url: string;
};

// Storage key for last playback position
const PLAYBACK_POSITION_KEY_PREFIX = '@kaizen_playback_position_';

interface StreamingResponse {
  direct?: string;
  quality?: {
    [key: string]: string;
  };
  error?: string;
}

export default function StreamingPage() {
  const params = useLocalSearchParams();
  const { id, audioType, episode, title, thumbnail } = params;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  
  // Video player states
  const videoRef = useRef<Video | null>(null);
  const [status, setStatus] = useState<any>({});
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  
  // Quality selection states
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [showQualityModal, setShowQualityModal] = useState(false);
  
  // Playback speed states
  const [playbackSpeeds] = useState([0.5, 0.75, 1.0, 1.25, 1.5, 2.0]);
  const [selectedSpeed, setSelectedSpeed] = useState(1.0);
  const [showSpeedModal, setShowSpeedModal] = useState(false);

  // Use the downloads context
  const { 
    startDownload, 
    downloadPermissionGranted, 
    requestDownloadPermissions, 
    getDownloadsByAnimeId 
  } = useDownloads();
  
  // Use the watch history context
  const { addToHistory } = useWatchHistory();
  
  // Control timeout ref
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Skip backward 10 seconds
  const skipBackward = async () => {
    if (videoRef.current && status.isLoaded) {
      const newPosition = Math.max(0, currentTime - 10000);
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  // Skip forward 10 seconds
  const skipForward = async () => {
    if (videoRef.current && status.isLoaded) {
      const newPosition = Math.min(duration, currentTime + 10000);
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

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

  // Reset orientation when component unmounts
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    };
  }, []);

  // Fetch the streaming URL and quality options when component mounts
  useEffect(() => {
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
        
        // Set quality options if available
        const qualityOpts: QualityOption[] = [{ label: 'Auto', url: data.direct }];
        if (data.quality) {
          Object.keys(data.quality).forEach(key => {
            qualityOpts.push({ label: key, url: data.quality![key] });
          });
        }
        setQualityOptions(qualityOpts);
        
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

  // Set up auto-save interval and save playback position when the component unmounts
  useEffect(() => {
    // Save playback position every 15 seconds
    const autoSaveInterval = setInterval(() => {
      if (status.isLoaded) {
        // Save regardless of playing status, as long as video is loaded
        // This helps capture progress even if user is paused
        savePlaybackPosition();
      }
    }, 15000);
    
    // Cleanup function
    return () => {
      clearInterval(autoSaveInterval);
      savePlaybackPosition();
    };
  }, [currentTime, status.isLoaded]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        toggleFullscreen();
        return true;
      }
      
      // Save playback position before navigating back
      savePlaybackPosition();
      router.back();
      return true;
    });

    return () => backHandler.remove();
  }, [router, isFullscreen, currentTime]);

  // Get the watch history context
  const { getWatchedEpisodes } = useWatchHistory();
  
  // Load saved playback position from cloud history first, then fallback to AsyncStorage
  const loadPlaybackPosition = async () => {
    try {
      // First check if we have this episode in watch history (which includes cloud data)
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
      } else {
        // Fallback to legacy storage method
        const key = `${PLAYBACK_POSITION_KEY_PREFIX}${id}_${episode}_${audioType}`;
        const savedPosition = await AsyncStorage.getItem(key);
        
        if (savedPosition) {
          position = parseInt(savedPosition, 10);
          foundPosition = true;
          console.log(`Found legacy position for ${id} episode ${episode}: ${position}ms`);
        }
      }
      
      // If we found a position and it's significant enough, ask to resume
      if (foundPosition && position > 30000) { // Only ask if more than 30 seconds in
        Alert.alert(
          "Resume Playback",
          "Do you want to continue where you left off?",
          [
            {
              text: "Start Over",
              style: "cancel"
            },
            {
              text: "Resume",
              onPress: async () => {
                if (videoRef.current) {
                  await videoRef.current.setPositionAsync(position);
                }
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error('Error loading playback position:', err);
    }
  };

  // Save current playback position to AsyncStorage and update watch history
  const savePlaybackPosition = async () => {
    try {
      if (currentTime > 0 && duration > 0) {
        // Save to AsyncStorage (legacy method - for backward compatibility)
        const key = `${PLAYBACK_POSITION_KEY_PREFIX}${id}_${episode}_${audioType}`;
        await AsyncStorage.setItem(key, currentTime.toString());
        
        // Update the watch history context
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
        
        // Log that we've saved watch history (for debugging)
        console.log(`Saved watch history: ${id}, ep ${episode}, position: ${Math.floor(currentTime)}ms / ${Math.floor(duration)}ms`);
      }
    } catch (err) {
      console.error('Error saving playback position:', err);
    }
  };

  const handleGoBack = () => {
    // Save playback position before navigating back
    savePlaybackPosition();
    router.back();
  };

  // Handle video playback status updates
  const onPlaybackStatusUpdate = (status: any) => {
    setStatus(status);
    
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis);
      setDuration(status.durationMillis);
      
      // If video is at least 5 seconds in, and position has changed by more than 5 seconds,
      // or if playback is paused/ended, trigger a save to ensure we track progress
      const significantProgress = Math.abs(currentTime - status.positionMillis) > 5000;
      const isAtLeastFewSecondsIn = status.positionMillis > 5000;
      const playbackStatusChanged = (status.isPlaying === false && status.positionMillis > 0);
      
      // Check for video completion (didJustFinish is only available in success status)
      const isPlaybackFinished = status.isLoaded && 'didJustFinish' in status && status.didJustFinish === true;
      
      if ((isAtLeastFewSecondsIn && significantProgress) || playbackStatusChanged || isPlaybackFinished) {
        console.log("Saving watch history due to playback status change or progress");
        savePlaybackPosition();
      }
    }
  };

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

  // Handle video seeking
  const handleSeek = async (value: number) => {
    if (videoRef.current) {
      setSeeking(true);
      await videoRef.current.setPositionAsync(value);
      setSeeking(false);
    }
  };

  // Handle slider seeking (when user is actively dragging the slider)
  const handleSeeking = (value: number) => {
    setCurrentTime(value);
  };

  // Change quality
  const changeQuality = async (quality: QualityOption) => {
    try {
      if (videoRef.current && quality.url !== streamingUrl) {
        // Remember the current position and playing state
        const currentPosition = status.positionMillis;
        const wasPlaying = status.isPlaying;
        
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
      Alert.alert('Error', 'Failed to change video quality');
    } finally {
      setShowQualityModal(false);
    }
  };

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
      Alert.alert('Error', 'Failed to change playback speed');
    }
  };

  // Request media library permission and start download
  const startDownloadProcess = async () => {
    if (!streamingUrl) {
      Alert.alert('Error', 'No video URL available to download');
      return;
    }
    
    // First check permissions
    if (!downloadPermissionGranted) {
      const granted = await requestDownloadPermissions();
      if (!granted) {
        Alert.alert('Permission Required', 'Storage permission is required to download videos');
        return;
      }
    }
    
    // Check if file has a title
    const episodeTitle = title ? `${title} - Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})` : `Episode ${episode} (${audioType === 'sub' ? 'Subbed' : 'Dubbed'})`;
    
    // Confirm download with user
    Alert.alert(
      'Download Episode',
      `Do you want to download ${episodeTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          style: 'default',
          onPress: async () => {
            try {
              // Generate a unique ID for this download
              const downloadId = ID.unique();
              
              await startDownload({
                id: downloadId,
                animeId: id as string,
                episodeNumber: episode as string,
                audioType: audioType as 'sub' | 'dub',
                title: episodeTitle,
                downloadUrl: streamingUrl,
                thumbnail: thumbnail as string || ''
              });
              
              // Show success notification
              if (Platform.OS === 'android') {
                ToastAndroid.show('Download started!', ToastAndroid.SHORT);
              } else {
                Alert.alert('Download Started', 'Check the Downloads section to view progress');
              }
            } catch (err) {
              console.error('Error starting download:', err);
              Alert.alert('Download Failed', 'There was an error starting the download');
            }
          }
        }
      ]
    );
  };

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

      {/* Main video content area */}
      <TouchableOpacity 
        activeOpacity={1}
        style={styles.videoContainer}
        onPress={() => setShowControls(!showControls)}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
            <Text style={styles.loadingText}>Loading stream...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.dark.buttonBackground} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => router.replace({ pathname: '/streaming', params: params })}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.playerContainer}>
            {streamingUrl ? (
              <>
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
                      savePlaybackPosition();
                    }
                  }}
                  useNativeControls={false}
                  posterSource={{ uri: thumbnail as string }}
                  usePoster={true}
                  posterStyle={styles.poster}
                />
                
                {/* Custom controls overlay */}
                {showControls && (
                  <View style={styles.controlsOverlay}>
                    {/* Top controls bar */}
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
                    
                    {/* Bottom controls bar */}
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
                      
                      {/* Bottom buttons row */}
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
                        
                        {/* Quality selection button */}
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
                        
                        {/* Fullscreen button */}
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

      {/* Quality selection modal */}
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

      {/* Speed selection modal */}
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