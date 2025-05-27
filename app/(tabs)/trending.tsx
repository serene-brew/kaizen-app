// React hooks for state management and side effects
import { useState, useEffect } from "react";

// React Native core components for UI rendering and device interaction
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from "react-native";

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Expo Router for navigation
import { router } from "expo-router";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Component-specific styles
import { styles } from "../../styles/trending.styles";

// API utilities for fetching anime data
import { animeApi } from "../../lib/api";

// TypeScript interfaces for type safety
import { AnimeItem } from "../../types/anime";

// Watchlist context for managing user's saved anime
import { useWatchlist } from '../../contexts/WatchlistContext';

// Get device screen width for responsive grid layout
const { width } = Dimensions.get('window');

// Grid layout constants for consistent spacing and sizing
const PADDING = 16; // Container horizontal padding
const GAP = 10; // Gap between grid items

/**
 * Helper function to map API response to our AnimeItem structure
 * Ensures consistent data format across different API endpoints
 * Handles missing or inconsistent fields from various anime data sources
 */
const mapAnimeData = (item: any): AnimeItem => {
  return {
    id: item.id?.toString() || item._id?.toString() || String(Math.random()),
    englishName: item.englishName || item.title || item.name || "Unknown Anime",
    thumbnail: item.thumbnail || item.image || item.coverImage || "",
    score: item.score || item.rating || 0,
    genres: item.genres || [],
    format: item.format || "",
    status: item.status || "",
    episodes: item.episodes || 0,
    duration: item.duration || 0,
    startDate: item.startDate || { year: 0, month: 0, day: 0 }
  };
};

/**
 * TrendingPage Component
 * 
 * Displays currently trending anime in a responsive grid layout.
 * Features:
 * - Two-column grid layout optimized for mobile screens
 * - Real-time trending data from dedicated API endpoint
 * - Watchlist integration for quick bookmarking
 * - Loading and error states with retry functionality
 * - Navigation to detailed anime information
 * - Responsive design that adapts to different screen sizes
 */
export default function TrendingPage() {
  // State management for anime data and UI states
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]); // List of trending anime
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  const [error, setError] = useState<string | null>(null); // Error state for failed requests
  
  // Extract watchlist functionality from context
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  /**
   * Data Fetching Effect
   * 
   * Loads trending anime data from dedicated API endpoint on component mount.
   * Handles loading states, error conditions, and data mapping.
   * Provides comprehensive error handling and user feedback.
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Starting to fetch trending anime data...");
        // Using the dedicated trending anime endpoint for current trends
        const rawData = await animeApi.fetchTrendingAnime();
        
        // Validate received data
        if (!rawData || rawData.length === 0) {
          console.warn("Received empty data from API");
          setError("No anime data available");
          return;
        }
        
        // Map API response to consistent format
        const mappedData = rawData.map(mapAnimeData);
        console.log(`Successfully mapped ${mappedData.length} trending anime items`);
        
        setTrendingAnime(mappedData);
      } catch (err) {
        console.error("Error fetching trending anime:", err);
        setError("Failed to load trending anime data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Anime Card Press Handler
   * 
   * Navigates to anime details page with proper source tracking
   * for accurate back navigation and analytics.
   */
  const handlePressCard = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id: item.id, title: item.englishName, source: 'trending' }
    });
  };

  /**
   * Watchlist Toggle Handler
   * 
   * Adds or removes anime from user's watchlist using context.
   * Prevents event bubbling to avoid triggering card navigation.
   * Provides immediate UI feedback through context state updates.
   */
  const toggleWatchlistItem = (id: string, event: any) => {
    event.stopPropagation(); // Prevent triggering card press when toggling watchlist
    
    // Find the anime item to get complete information for watchlist
    const animeItem = trendingAnime.find(item => item.id === id);
    if (animeItem) {
      // Use the context function to update the watchlist in Appwrite
      toggleWatchlist(
        id,
        animeItem.englishName || animeItem.title || 'Unknown Anime',
        animeItem.thumbnail || ''
      );
    }
  };

  /**
   * Loading State Render
   * Displays loading spinner and text while fetching trending anime data
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading trending anime...</Text>
      </View>
    );
  }

  /**
   * Error State Render
   * Displays error message with retry functionality when data fetching fails
   */
  if (error) {
    return (
      <View style={styles.errorContainer}>
        {/* Error icon for visual feedback */}
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.dark.buttonBackground} />
        {/* Error message display */}
        <Text style={styles.errorText}>{error}</Text>
        {/* Retry button for manual data refetch */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            animeApi.fetchTrendingAnime()
              .then(data => {
                if (data && data.length > 0) {
                  setTrendingAnime(data.map(mapAnimeData));
                  setError(null);
                } else {
                  setError("No anime data available");
                }
              })
              .catch(err => {
                console.error("Error retrying fetch:", err);
                setError("Failed to load trending anime data");
              })
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Empty State Render
   * Displays message when no trending anime data is available
   */
  if (trendingAnime.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No trending anime available</Text>
      </View>
    );
  }

  /**
   * Main Content Render
   * 
   * Displays trending anime in a responsive two-column grid layout.
   * Each card includes poster image, title, and watchlist toggle.
   * Grid adapts to screen size and maintains consistent spacing.
   */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Two-column grid container */}
      <View style={styles.grid}>
        {trendingAnime.map((item, index) => (
          <TouchableOpacity 
            key={`trending-${item.id}`} 
            style={[
              styles.card,
              // Add margin to every first item in each row (even indices)
              index % 2 === 0 ? { marginRight: GAP } : null
            ]}
            onPress={() => handlePressCard(item)}
          >
            {/* Anime poster container with watchlist overlay */}
            <View style={styles.posterPlaceholder}>
              {/* Poster image with fallback placeholder */}
              {item.thumbnail ? (
                <Image 
                  source={{ uri: item.thumbnail }} 
                  style={styles.posterImage}
                  resizeMode="cover"
                />
              ) : (
                /* Fallback icon when no thumbnail available */
                <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
              )}
              {/* Watchlist toggle button overlaid on poster */}
              <TouchableOpacity 
                style={styles.watchlistIcon}
                onPress={(e) => toggleWatchlistItem(item.id, e)}
              >
                <MaterialCommunityIcons 
                  name={isInWatchlist(item.id) ? "bookmark" : "bookmark-outline"}
                  size={24} 
                  color={isInWatchlist(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
                />
              </TouchableOpacity>
            </View>
            {/* Anime title with line limiting for consistent card height */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.englishName || "Unknown Anime"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
