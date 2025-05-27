// React hooks for state management and side effects
import { useState, useEffect } from "react";

// React Native core components for UI rendering and device interaction
import { View, Text, ActivityIndicator, Image, TouchableOpacity, ScrollView, Dimensions } from "react-native";

// Expo Router for navigation
import { router } from "expo-router";

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Component-specific styles
import { styles } from "../../styles/top.styles";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// API utilities for fetching anime data
import { animeApi } from "../../lib/api";

// Watchlist context for managing user's saved anime
import { useWatchlist } from "../../contexts/WatchlistContext";

// TypeScript interfaces for type safety
import { AnimeItem } from "../../types/anime";

// Get device screen width for responsive grid layout
const { width } = Dimensions.get("window");

// Grid layout constants for consistent spacing and sizing
const PADDING = 16; // Container horizontal padding
const GAP = 10; // Gap between grid items
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2; // Calculate card width for 2-column grid

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
 * TopPage Component
 * 
 * Displays the highest-rated anime in a responsive grid layout.
 * Features:
 * - Two-column grid layout optimized for mobile screens
 * - Watchlist integration for quick bookmarking
 * - Loading and error states with retry functionality
 * - Navigation to detailed anime information
 * - Responsive design that adapts to different screen sizes
 */
export default function TopPage() {
  // State management for anime data and UI states
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]); // List of top-rated anime
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  const [error, setError] = useState<string | null>(null); // Error state for failed requests

  // Extract watchlist functionality from context
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  /**
   * Data Fetching Effect
   * 
   * Loads top anime data from API on component mount.
   * Handles loading states, error conditions, and data mapping.
   * Provides comprehensive error handling and user feedback.
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Starting to fetch top anime data...");
        const rawData = await animeApi.fetchTopAnime();

        // Validate received data
        if (!rawData || rawData.length === 0) {
          console.warn("Received empty data from API");
          setError("No anime data available");
          return;
        }

        // Map API response to consistent format
        const mappedData = rawData.map(mapAnimeData);
        console.log(`Successfully mapped ${mappedData.length} top anime items`);

        setAnimeList(mappedData);
      } catch (err) {
        console.error("Error fetching top anime:", err);
        setError("Failed to load top anime data");
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
      params: { id: item.id, title: item.englishName, source: "top" }
    });
  };

  /**
   * Watchlist Toggle Handler
   * 
   * Adds or removes anime from user's watchlist.
   * Prevents event bubbling to avoid triggering card navigation.
   * Provides immediate UI feedback through context state updates.
   */
  const toggleWatchlistItem = (id: string, event: any) => {
    event.stopPropagation(); // Prevent triggering card press when toggling watchlist

    // Find the anime item to get complete information for watchlist
    const animeItem = animeList.find((item) => item.id === id);
    if (animeItem) {
      toggleWatchlist(id, animeItem.englishName, animeItem.thumbnail);
    }
  };

  /**
   * Loading State Render
   * Displays loading spinner and text while fetching anime data
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading Top anime...</Text>
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
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={Colors.dark.buttonBackground}
        />
        {/* Error message display */}
        <Text style={styles.errorText}>{error}</Text>
        {/* Retry button for manual data refetch */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            animeApi
              .fetchTopAnime()
              .then((data) => {
                if (data && data.length > 0) {
                  setAnimeList(data.map(mapAnimeData));
                  setError(null);
                } else {
                  setError("No anime data available");
                }
              })
              .catch((err) => {
                console.error("Error retrying fetch:", err);
                setError("Failed to load top anime data");
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
   * Displays message when no anime data is available
   */
  if (animeList.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No top anime available</Text>
      </View>
    );
  }

  /**
   * Main Content Render
   * 
   * Displays top anime in a responsive two-column grid layout.
   * Each card includes poster image, title, and watchlist toggle.
   * Grid adapts to screen size and maintains consistent spacing.
   */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Two-column grid container */}
      <View style={styles.grid}>
        {animeList.map((item, index) => (
          <TouchableOpacity
            key={`top-${item.id}`}
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
                <MaterialCommunityIcons
                  name="image"
                  size={40}
                  color={Colors.dark.secondaryText}
                />
              )}
              {/* Watchlist toggle button overlaid on poster */}
              <TouchableOpacity
                style={styles.watchlistIcon}
                onPress={(event) => toggleWatchlistItem(item.id, event)}
              >
                <MaterialCommunityIcons
                  name={
                    isInWatchlist(item.id) ? "bookmark" : "bookmark-outline"
                  }
                  size={24}
                  color={
                    isInWatchlist(item.id)
                      ? Colors.dark.buttonBackground
                      : Colors.dark.text
                  }
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
