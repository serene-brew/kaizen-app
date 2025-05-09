import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from "react";
import { styles } from "../../styles/details.styles";
import { StatusBar } from 'expo-status-bar';

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
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animeData, setAnimeData] = useState<AnimeDetailsResponse['result'] | null>(null);

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
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

  const toggleWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    // TODO: Implement actual watchlist functionality
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" translucent />
      
      <View style={styles.header}>
        <View style={styles.posterContainer}>
          <Image 
            source={{ uri: animeData.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image' }}
            style={styles.poster}
            resizeMode="cover"
          />
          <TouchableOpacity 
            style={styles.watchlistButton} 
            onPress={toggleWatchlist}
          >
            <MaterialCommunityIcons 
              name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isInWatchlist ? Colors.dark.buttonBackground : Colors.dark.text} 
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
                style={styles.episodeBox}
                onPress={() => console.log(`Play episode ${episode} (${audioType})`)}
              >
                <Text style={styles.episodeNumber}>{episode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
