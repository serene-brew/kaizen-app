// React Native core components for UI rendering and device interaction
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator, BackHandler } from "react-native";

// Icon libraries for visual elements
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Expo Router hooks for navigation and parameter handling
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

// React hooks for state management and side effects
import { useState, useEffect, useCallback, useMemo } from "react";

// Component-specific styles
import { styles } from "../../styles/details.styles";

// Status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// TypeScript interfaces for type safety
import { AnimeItem } from "../../types/anime";

// Context hooks for watchlist and watch history management
import { useWatchlist } from '../../contexts/WatchlistContext';
import { useWatchHistory } from '../../contexts/WatchHistoryContext';
import type { WatchHistoryItem } from '../../contexts/WatchHistoryContext';

// AsyncStorage for local data persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get device screen width for responsive poster sizing
const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.35; // Poster takes 35% of screen width

/**
 * Interface for the API response structure
 * Defines the expected format from the anime details API endpoint
 */
interface AnimeDetailsResponse {
  result: {
    id: string;
    title: string;
    englishName: string | null;
    description: string | null;
    thumbnail: string | null;
    genres: string[] | null;
    status: string | null;
    type: string | null;
    rating: string | null;
    score: number | null;
    subCount: number | null;
    dubCount: number | null;
    episodes: {
      sub: string[] | null;
      dub: string[] | null;
    } | null;
  } | null;
}

/**
 * DetailsPage Component
 * 
 * Displays comprehensive information about a specific anime including:
 * - Poster image and basic information (title, rating, genres)
 * - Description with expand/collapse functionality
 * - Episode list with watch status tracking
 * - Watchlist toggle functionality
 * - SUB/DUB audio options when available
 * - Navigation integration with proper back button handling
 */
export default function DetailsPage() {
  // Extract route parameters for anime identification and navigation context
  const params = useLocalSearchParams();
  const { id, title } = params;
  const source = typeof params.source === 'string' ? params.source : undefined;
  const searchTypeParam = typeof params.type === 'string' ? params.type : undefined;
  const searchQueryParam = typeof params.query === 'string' ? params.query : undefined;
  const searchGenresParam = typeof params.genres === 'string' ? params.genres : undefined;
  const router = useRouter();
  
  // Local component state management
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub'); // Currently selected audio type
  const [expandedDescription, setExpandedDescription] = useState(false); // Description expand state
  const [loading, setLoading] = useState(true); // Data loading state
  const [error, setError] = useState<string | null>(null); // Error state for API failures
  const [animeData, setAnimeData] = useState<AnimeDetailsResponse['result'] | null>(null); // Main anime data
  const [mostRecentEpisodeByAudio, setMostRecentEpisodeByAudio] = useState<Record<'sub' | 'dub', string>>(() => ({
    sub: '',
    dub: '',
  }));
  const [selectedRange, setSelectedRange] = useState(0); // Currently selected episode range index
  const [sortDescending, setSortDescending] = useState(false); // Sort order for episodes

  // Context hooks for watchlist and watch history functionality
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  /**
   * Anime Details Data Fetching Effect
   * 
   * Handles loading anime details with two data sources:
   * 1. Complete data passed via navigation params (faster, no API call)
   * 2. API fetch using anime ID (fallback or when no complete data available)
   */
  useEffect(() => {
    const fetchAnimeDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      // Check if we have complete anime data in params
      if (params.completeData) {
        try {
          // Parse the stringified complete data if available
          const completeData = JSON.parse(decodeURIComponent(params.completeData as string));
          if (completeData && completeData.id) {
            console.log("Using complete anime data from params");
            
            // Format data to match our expected structure
            const formattedData = {
              id: completeData.id,
              title: completeData.title || completeData.englishName,
              englishName: completeData.englishName,
              description: completeData.description || null,
              thumbnail: completeData.thumbnail || null,
              genres: completeData.genres || null,
              status: completeData.status || null,
              type: completeData.format || completeData.type || null,
              rating: completeData.rating || null,
              score: completeData.score || null,
              subCount: completeData.subCount || null,
              dubCount: completeData.dubCount || null,
              episodes: completeData.episodes || { sub: null, dub: null }
            };
            
            setAnimeData(formattedData);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Error parsing complete anime data:", err);
          // Continue to fetch data if parsing failed
        }
      }
      
      // If no complete data or parsing failed, fetch from API
      try {
        console.log("Fetching anime details from API");
        const response = await fetch(`https://heavenscape.vercel.app/api/anime/id/${id}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data: AnimeDetailsResponse = await response.json();
        
        if (!data) {
          throw new Error('Invalid data received from API');
        }
        
        setAnimeData(data.result);
      } catch (err) {
        console.error('Error fetching anime details:', err);
        setError('Failed to load anime details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnimeDetails();
  }, [id]);

  // Get watch history functionality from context
  const { getWatchedEpisodes } = useWatchHistory();
  
  // State for tracking all watched episodes (used for UI indicators)
  const [watchedEpisodesByAudio, setWatchedEpisodesByAudio] = useState<Record<'sub' | 'dub', Set<string>>>(() => ({
    sub: new Set<string>(),
    dub: new Set<string>(),
  }));
  
  /**
   * Watch History Loading Effect
   * 
   * Loads and tracks user's watch history for this anime:
   * - Gets all watched episodes from context
   * - Updates UI indicators for watched episodes
   * - Identifies most recently watched episode
   * - Refreshes periodically to catch updates from streaming screen
   */
  useEffect(() => {
    const loadWatchHistory = () => {
      if (id) {
        try {
          // Get all watched episodes for this anime
          const historyEpisodes = getWatchedEpisodes(id as string);

          if (historyEpisodes.length > 0) {
            const subEpisodes = new Set<string>();
            const dubEpisodes = new Set<string>();
            const latestByAudio: Record<'sub' | 'dub', WatchHistoryItem | null> = {
              sub: null,
              dub: null,
            };

            historyEpisodes.forEach((entry) => {
              const entryAudioType: 'sub' | 'dub' = entry.audioType || 'sub';

              if (entryAudioType === 'sub') {
                subEpisodes.add(entry.episodeNumber);
              } else if (entryAudioType === 'dub') {
                dubEpisodes.add(entry.episodeNumber);
              }

              const currentLatest = latestByAudio[entryAudioType];
              if (!currentLatest || entry.watchedAt > currentLatest.watchedAt) {
                latestByAudio[entryAudioType] = entry;
              }
            });

            setWatchedEpisodesByAudio({
              sub: subEpisodes,
              dub: dubEpisodes,
            });

            setMostRecentEpisodeByAudio({
              sub: latestByAudio.sub?.episodeNumber || '',
              dub: latestByAudio.dub?.episodeNumber || '',
            });
          } else {
            // Clear the states if no history
            setWatchedEpisodesByAudio({
              sub: new Set<string>(),
              dub: new Set<string>(),
            });
            setMostRecentEpisodeByAudio({ sub: '', dub: '' });
          }
        } catch (err) {
          console.error('Error loading watched episode data:', err);
        }
      }
    };
    
    // Load watch history initially
    loadWatchHistory();
    
    // Check for updates regularly while component is mounted
    const refreshInterval = setInterval(loadWatchHistory, 3000);
    
    return () => clearInterval(refreshInterval);
  }, [id, getWatchedEpisodes, router]);

  /**
   * Custom Back Navigation Handler
   * 
   * Navigates back to the appropriate screen based on source parameter:
   * - Maintains navigation context from where user arrived
   * - Provides smooth user experience by returning to correct screen
   */
  const handleGoBack = useCallback(() => {
    if (source === 'search') {
      router.replace({
        pathname: '/searchResults',
        params: {
          type: searchTypeParam || 'anime',
          ...(searchQueryParam ? { query: searchQueryParam } : {}),
          ...(searchGenresParam ? { genres: searchGenresParam } : {}),
        },
      });
    } else if (source === 'history') {
      router.replace('/(tabs)/history');
    } else {
      router.back();
    }
  }, [router, source, searchTypeParam, searchQueryParam, searchGenresParam]);

  /**
   * Hardware Back Button Handling Effect
   * 
   * Handles Android hardware back button press to ensure proper navigation
   * Prevents default back behavior and uses custom navigation logic
   */
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }, [handleGoBack])
  );

  /**
   * Watchlist Toggle Handler
   * 
   * Adds or removes anime from user's watchlist using context
   * Provides immediate UI feedback through context state updates
   */
  const handleToggleWatchlist = () => {
    if (!animeData) return;

    toggleWatchlist(
      animeData.id,
      animeData.englishName || animeData.title || 'Unknown Anime',
      animeData.thumbnail || ''
    );
  };

  // Determine availability of SUB/DUB episodes for UI display
  const hasSubEpisodes = animeData?.episodes?.sub && animeData.episodes.sub.length > 0;
  const hasDubEpisodes = animeData?.episodes?.dub && animeData.episodes.dub.length > 0;

  // Pagination logic for episodes
  const EPISODES_PER_PAGE = 50;
  const currentEpisodes = animeData?.episodes?.[audioType] || [];
  
  // Create episode ranges using actual episode numbers
  const episodeRanges = useMemo(() => {
    const ranges: { start: number; end: number; label: string }[] = [];
    const total = currentEpisodes.length;
    
    for (let i = 0; i < total; i += EPISODES_PER_PAGE) {
      const start = i + 1;
      const end = Math.min(i + EPISODES_PER_PAGE, total);
      const firstEpisode = currentEpisodes[i];
      const lastEpisode = currentEpisodes[Math.min(i + EPISODES_PER_PAGE - 1, total - 1)];
      ranges.push({
        start,
        end,
        label: `${firstEpisode}-${lastEpisode}`
      });
    }
    
    return ranges;
  }, [currentEpisodes]);

  // Get paginated episodes for current range
  const paginatedEpisodes = useMemo(() => {
    if (episodeRanges.length === 0) return [];
    
    const range = episodeRanges[selectedRange];
    if (!range) return [];
    
    const start = range.start - 1;
    const end = range.end;
    let episodes = currentEpisodes.slice(start, end);
    
    // Apply sort order
    if (sortDescending) {
      episodes = [...episodes].reverse();
    }
    
    return episodes;
  }, [currentEpisodes, selectedRange, episodeRanges, sortDescending]);

  // Reset to first range when audio type changes
  useEffect(() => {
    setSelectedRange(0);
  }, [audioType]);
  
  /**
   * Audio Type Auto-Selection Effect
   * 
   * Automatically adjusts audio type selection based on episode availability:
   * - Switches from DUB to SUB if DUB episodes unavailable
   * - Switches from SUB to DUB if SUB episodes unavailable and DUB available
   */
  useEffect(() => {
    if (animeData) {
      if (audioType === 'dub' && !hasDubEpisodes) {
        setAudioType('sub');
      } else if (audioType === 'sub' && !hasSubEpisodes && hasDubEpisodes) {
        setAudioType('dub');
      }
    }
  }, [animeData]);

  /**
   * Loading State Render
   * Displays loading spinner and text while fetching anime details
   */
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 16 }}>Loading anime details...</Text>
      </View>
    );
  }

  /**
   * Error State Render
   * Displays error message when API fetch fails or no data available
   */
  if (error || !animeData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 16 }}>{error || 'Could not load anime details'}</Text>
      </View>
    );
  }

  // Check watchlist status using context for real-time updates
  const isInWatchlistCache = isInWatchlist(animeData.id);

  const watchedEpisodesForAudio = watchedEpisodesByAudio[audioType];
  const mostRecentEpisodeForAudio = mostRecentEpisodeByAudio[audioType];

  /**
   * Main Details Page Render
   * 
   * Displays comprehensive anime information including:
   * - Header with poster, title, rating, and action buttons
   * - Expandable description section
   * - Genre tags
   * - Episode grid with watch status indicators
   * - SUB/DUB selection when applicable
   */
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" translucent />
      
      {/* Back button at the top of the page */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>
      
      {/* Header section with poster and main information */}
      <View style={styles.header}>
        <View style={styles.posterContainer}>
          {/* Anime poster image with fallback */}
          <Image 
            source={{ uri: animeData.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image' }}  // Even the placeholder image doesnot exist, it will not break the app, thats why it is added, might change it later with something like a local image of 404 not found anime edition
            style={styles.poster}
            resizeMode="cover"
          />
          {/* Watchlist toggle button overlaid on poster */}
          <TouchableOpacity 
            style={styles.watchlistButton} 
            onPress={handleToggleWatchlist}
          >
            <MaterialCommunityIcons 
              name={isInWatchlistCache ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isInWatchlistCache ? Colors.dark.buttonBackground : Colors.dark.text} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Information container with title, rating, and controls */}
        <View style={styles.infoContainer}>
          {/* Anime title with line limit for clean layout */}
          <Text style={styles.title} numberOfLines={2}>{animeData.englishName || animeData.title || 'Unknown Anime'}</Text>  
          
          {/* Rating badge - only show if score exists */}
          {animeData.score && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{animeData.score.toFixed(1)}</Text>
            </View>
          )}
          
          {/* Information badges for rating, type, and status */}
          <View style={styles.badges}>
            {animeData.rating && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{animeData.rating}</Text>
              </View>
            )}
            {animeData.type && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{animeData.type}</Text>
              </View>
            )}
            {animeData.status && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{animeData.status}</Text>
              </View>
            )}
          </View>
          
          {/* Audio type selection buttons - only show if episodes available */}
          {(hasSubEpisodes || hasDubEpisodes) && (
            <View style={styles.actions}>
              {hasSubEpisodes && (
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.audioButton,
                    audioType === 'sub' ? null : styles.buttonInactive
                  ]}
                  onPress={() => setAudioType('sub')}
                >
                  <Text style={[
                    styles.buttonText,
                    audioType === 'sub' ? null : styles.buttonTextInactive
                  ]}>SUB</Text>
                </TouchableOpacity>
              )}
              {hasDubEpisodes && (
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.audioButton,
                    audioType === 'dub' ? null : styles.buttonInactive
                  ]}
                  onPress={() => setAudioType('dub')}
                >
                  <Text style={[
                    styles.buttonText,
                    audioType === 'dub' ? null : styles.buttonTextInactive
                  ]}>DUB</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Description section with expand/collapse - always show to display full title */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.sectionTitle}>Description</Text>
        {/* Enhanced description with full title and actual description */}
        <Text 
          style={styles.description} 
          numberOfLines={expandedDescription ? undefined : 4} // Increased to 4 to accommodate title line
        >
          {/* Full title as first line */}
          <Text style={styles.fullTitle}>
            {animeData.englishName || animeData.title || 'Unknown Anime'}
          </Text>
          {/* Empty line separator */}
          {animeData.description && '\n\n'}
          {/* Actual description if available */}
          {animeData.description || 'No description available.'}
        </Text>
        {/* Expand/collapse button - show only if content exceeds 4 lines */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpandedDescription(!expandedDescription)}
        >
          <Text style={styles.expandButtonText}>
            {expandedDescription ? "Show Less" : "Read More"}
          </Text>
          <MaterialCommunityIcons 
            name={expandedDescription ? "chevron-up" : "chevron-down"} 
            size={16} 
            color={Colors.dark.buttonBackground} 
          />
        </TouchableOpacity>
      </View>

      {/* Genres section - only show if genres exist */}
      {animeData.genres && animeData.genres.length > 0 && (
        <View style={styles.genresContainer}>
          <View style={styles.genresList}>
            {/* Genre chips with unique keys */}
            {animeData.genres.map((genre, index) => (
              <View key={`genre-${index}`} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Episodes section - only show if episodes exist for selected audio type */}
      {animeData.episodes && animeData.episodes[audioType] && animeData.episodes[audioType]?.length > 0 && (
        <View style={styles.episodesSection}>
          <View style={styles.episodesHeader}>
            <Text style={styles.sectionTitle}>Episodes ({currentEpisodes.length})</Text>
            {/* Sort order toggle button */}
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortDescending(!sortDescending)}
            >
              <MaterialCommunityIcons 
                name={sortDescending ? "sort-descending" : "sort-ascending"} 
                size={20} 
                color={Colors.dark.buttonBackground} 
              />
              <Text style={styles.sortButtonText}>
                {sortDescending ? "Desc" : "Asc"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Episode range selector - only show if more than 50 episodes */}
          {episodeRanges.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.rangeSelector}
              contentContainerStyle={styles.rangeSelectorContent}
            >
              {episodeRanges.map((range, index) => (
                <TouchableOpacity
                  key={`range-${index}`}
                  style={[
                    styles.rangeCard,
                    selectedRange === index && styles.rangeCardActive
                  ]}
                  onPress={() => setSelectedRange(index)}
                >
                  <Text style={[
                    styles.rangeCardText,
                    selectedRange === index && styles.rangeCardTextActive
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Episode grid with watch status indicators */}
          <View style={styles.episodeGrid}>
            {paginatedEpisodes.map((episode, index) => (
              <TouchableOpacity 
                key={`episode-${episode}-${index}`}
                style={[
                  styles.episodeBox,
                  watchedEpisodesForAudio.has(episode) && styles.watchedEpisodeBox,
                  episode === mostRecentEpisodeForAudio && styles.currentEpisodeBox
                ]}
                onPress={() => router.push({
                  pathname: "/streaming",
                  params: { 
                    id: animeData.id, 
                    audioType: audioType,
                    episode: episode,
                    title: animeData.englishName || animeData.title,
                    thumbnail: animeData.thumbnail
                  }
                })}
              >
                <Text style={[
                  styles.episodeNumber,
                  watchedEpisodesForAudio.has(episode) && styles.watchedEpisodeText
                ]}>{episode}</Text>
                {watchedEpisodesForAudio.has(episode) && (
                  <View style={styles.watchedIndicator}>
                    <MaterialCommunityIcons name="check" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
