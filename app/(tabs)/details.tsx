import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image } from "react-native";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from "react";
import { styles } from "../../styles/details.styles";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.35;

export default function DetailsPage() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

  // Mock data - would be fetched from API in a real implementation
  const animeData = {
    title: title || "Anime Title",
    poster: "https://via.placeholder.com/300x450",
    coverImage: "https://via.placeholder.com/900x400",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    rating: 8.7,
    genres: ["Action", "Adventure", "Fantasy"],
    format: "TV",
    status: "Ongoing",
    ageRating: "PG-13",
    episodes: 24
  };

  const toggleWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    // TODO: Implement actual watchlist functionality
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" translucent />
      
      {/* Header with cover image */}
      <View style={styles.coverContainer}>
        <Image 
          source={{ uri: animeData.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(22, 22, 34, 0.8)', Colors.dark.background]}
          style={styles.coverGradient}
        />
        {/* Back button removed as requested */}
      </View>
      
      <View style={styles.header}>
        <View style={styles.posterContainer}>
          <Image 
            source={{ uri: animeData.poster }}
            style={styles.poster}
            resizeMode="cover"
          />
          {/* Moved watchlist button to poster container */}
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
          <Text style={styles.title} numberOfLines={2}>{animeData.title}</Text>
          
          {/* Rating badge */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{animeData.rating.toFixed(1)}</Text>
          </View>
          
          {/* Info badges */}
          <View style={styles.badges}>
            {animeData.ageRating && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{animeData.ageRating}</Text>
              </View>
            )}
            {animeData.format && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{animeData.format}</Text>
              </View>
            )}
            {animeData.status && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{animeData.status}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.actions}>
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
          </View>
        </View>
      </View>

      {/* Description section with expand/collapse */}
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

      {/* Genres section - removed the title but kept the chips */}
      <View style={styles.genresContainer}>
        <View style={styles.genresList}>
          {animeData.genres.map((genre, index) => (
            <View key={`genre-${index}`} style={styles.genreChip}>
              <Text style={styles.genreChipText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.episodesSection}>
        <Text style={styles.sectionTitle}>Episodes</Text>
        <View style={styles.episodeGrid}>
          {[...Array(animeData.episodes)].map((_, index) => (
            <TouchableOpacity 
              key={`episode-${index + 1}`}
              style={styles.episodeBox}
            >
              <Text style={styles.episodeNumber}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
