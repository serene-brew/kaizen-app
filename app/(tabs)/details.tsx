import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator, BackHandler } from "react-native";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from "react";
import { styles } from "../../styles/details.styles";
import { StatusBar } from 'expo-status-bar';
import { AnimeItem } from "../../types/anime";
import { useWatchlist } from '../../contexts/WatchlistContext';
import { useWatchHistory } from '../../contexts/WatchHistoryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.35;

// Interface for the API response
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

export default function DetailsPage() {
  const params = useLocalSearchParams();
  const { id, title, source } = params;
  const router = useRouter();
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub');
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animeData, setAnimeData] = useState<AnimeDetailsResponse['result'] | null>(null);
  const [watchedEpisode, setWatchedEpisode] = useState<string>('');

  // Use the watchlist context
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

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

  // Load watched episodes from WatchHistoryContext
  const { getWatchedEpisodes } = useWatchHistory();
  
  // For tracking all watched episodes
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  
  // Load watched episode data
  useEffect(() => {
    const loadWatchHistory = () => {
      if (id) {
        try {
          // Get all watched episodes for this anime
          const historyEpisodes = getWatchedEpisodes(id as string);
          
          if (historyEpisodes.length > 0) {
            // Create a set of all watched episode numbers
            const episodeSet = new Set(historyEpisodes.map(ep => ep.episodeNumber));
            setWatchedEpisodes(episodeSet);
            
            // Find the most recently watched episode for the main indicator
            const mostRecentEpisode = historyEpisodes.reduce((latest, current) => 
              current.watchedAt > latest.watchedAt ? current : latest
            );
            
            // Set the most recently watched episode
            setWatchedEpisode(mostRecentEpisode.episodeNumber);
          } else {
            // Clear the states if no history
            setWatchedEpisodes(new Set());
            setWatchedEpisode('');
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

  // Add back button handling with Android hardware back button support
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const handleGoBack = useCallback(() => {
    // Use the source param to determine where to go back to
    if (source === 'search') {
      router.push('/searchResults');
    } else if (source === 'trending') {
      router.push('/(tabs)/trending');
    } else if (source === 'top') {
      router.push('/(tabs)/top');
    } else if (source === 'watchlist') {
      router.push('/(tabs)/watchlist');
    } else if (source === 'history') {
      router.push('/(tabs)/history');
    } else {
      // Default to going back to explore page
      router.push('/(tabs)/explore');
    }
  }, [router, source]);

  const handleToggleWatchlist = () => {
    if (!animeData) return;

    toggleWatchlist(
      animeData.id,
      animeData.englishName || animeData.title || 'Unknown Anime',
      animeData.thumbnail || ''
    );
  };

  // Determine if SUB/DUB options should be available
  const hasSubEpisodes = animeData?.episodes?.sub && animeData.episodes.sub.length > 0;
  const hasDubEpisodes = animeData?.episodes?.dub && animeData.episodes.dub.length > 0;
  
  // Set default audio type based on availability
  useEffect(() => {
    if (animeData) {
      if (audioType === 'dub' && !hasDubEpisodes) {
        setAudioType('sub');
      } else if (audioType === 'sub' && !hasSubEpisodes && hasDubEpisodes) {
        setAudioType('dub');
      }
    }
  }, [animeData]);

  // Show loading state if data is being fetched
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 16 }}>Loading anime details...</Text>
      </View>
    );
  }

  // Show error state if there was a problem
  if (error || !animeData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 16 }}>{error || 'Could not load anime details'}</Text>
      </View>
    );
  }

  // Check if the anime is in the watchlist using the context
  const isInWatchlistCache = isInWatchlist(animeData.id);

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
      
      <View style={styles.header}>
        <View style={styles.posterContainer}>
          <Image 
            source={{ uri: animeData.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image' }}
            style={styles.poster}
            resizeMode="cover"
          />
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
        
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{animeData.englishName || animeData.title || 'Unknown Anime'}</Text>
          
          {/* Rating badge - only show if score exists */}
          {animeData.score && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{animeData.score.toFixed(1)}</Text>
            </View>
          )}
          
          {/* Info badges */}
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
          
          {/* Only show audio type toggles if at least one type is available */}
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

      {/* Description section with expand/collapse - only show if description exists */}
      {animeData.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text 
            style={styles.description} 
            numberOfLines={expandedDescription ? undefined : 3}
          >
            {animeData.description}
          </Text>
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
      )}

      {/* Genres section - only show if genres exist */}
      {animeData.genres && animeData.genres.length > 0 && (
        <View style={styles.genresContainer}>
          <View style={styles.genresList}>
            {animeData.genres.map((genre, index) => (
              <View key={`genre-${index}`} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Episodes section - only show if episodes exist for the selected audio type */}
      {animeData.episodes && animeData.episodes[audioType] && animeData.episodes[audioType]?.length > 0 && (
        <View style={styles.episodesSection}>
          <Text style={styles.sectionTitle}>Episodes</Text>
          <View style={styles.episodeGrid}>
            {animeData.episodes[audioType]?.map((episode, index) => (
              <TouchableOpacity 
                key={`episode-${episode}`}
                style={[
                  styles.episodeBox,
                  watchedEpisodes.has(episode) && styles.watchedEpisodeBox,
                  episode === watchedEpisode && styles.currentEpisodeBox
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
                  watchedEpisodes.has(episode) && styles.watchedEpisodeText
                ]}>{episode}</Text>
                {watchedEpisodes.has(episode) && (
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
