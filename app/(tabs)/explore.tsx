// React hooks for state management and side effects
import { useState, useEffect, useRef, useMemo } from "react";

// React Native core components for UI rendering and device interaction
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from "react-native";

// Icon libraries for visual elements
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Linear gradient component for visual overlays
import { LinearGradient } from 'expo-linear-gradient';

// Expo Router for navigation
import { router } from "expo-router";

// Status bar component for controlling appearance
import { StatusBar } from "expo-status-bar";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Component-specific styles
import { styles } from "../../styles/explore.styles";

// API utilities for fetching anime data
import { animeApi } from "../../lib/api";

// TypeScript interfaces for type safety
import { AnimeItem } from "../../types/anime";

// Watchlist context for managing user's saved anime
import { useWatchlist } from '../../contexts/WatchlistContext';

// Get device screen width for responsive carousel sizing
const { width } = Dimensions.get('window');

// Configuration constants for carousel behavior
const AUTO_SWIPE_INTERVAL = 6000; // Auto-swipe interval in milliseconds (6 seconds)
const CAROUSEL_COUNT = 5; // Number of featured anime items in carousel

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
 * Explore Component
 * 
 * Main discovery screen that displays:
 * - Featured anime carousel with auto-swipe functionality
 * - Trending anime horizontal scroll section
 * - Top anime horizontal scroll section
 * - Watchlist integration for quick bookmarking
 * - Navigation to detailed views and category pages
 */
export default function Explore() {
  // Ref for controlling carousel scroll programmatically
  const carouselRef = useRef<ScrollView>(null);
  
  // State for carousel navigation and current position
  const [activeIndex, setActiveIndex] = useState(0);
  
  // State for different anime data categories
  const [topAnime, setTopAnime] = useState<AnimeItem[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]);
  const [carouselAnime, setCarouselAnime] = useState<AnimeItem[]>([]);
  
  // Loading and error states for different sections
  const [loading, setLoading] = useState(true); // General loading for trending/top sections
  const [carouselLoading, setCarouselLoading] = useState(true); // Specific loading for carousel
  const [error, setError] = useState<string | null>(null);

  // Extract watchlist functionality from context
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  // Create infinite carousel data by duplicating items
  const infiniteCarouselData = useMemo(() => {
    if (carouselAnime.length === 0) return [];
    
    // Create infinite loop by adding copies at start and end
    const lastItem = carouselAnime[carouselAnime.length - 1];
    const firstItem = carouselAnime[0];
    
    return [lastItem, ...carouselAnime, firstItem];
  }, [carouselAnime]);

  /**
   * Data Fetching Effect
   * 
   * Loads anime data from multiple API endpoints in parallel:
   * - Top anime for top-rated section
   * - Trending anime for trending section  
   * - Featured anime for carousel display
   * 
   * Handles loading states and error conditions for each data source
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCarouselLoading(true);
      setError(null);
      
      try {
        console.log("Starting to fetch anime data for explore page...");
        
        // Fetch data from all endpoints in parallel for better performance
        const [topData, trendingData, carouselData] = await Promise.all([
          animeApi.fetchTopAnime(),
          animeApi.fetchTrendingAnime(),
          animeApi.fetchCarouselAnime(CAROUSEL_COUNT)
        ]);
        
        // Process top anime data
        if (!topData || topData.length === 0) {
          console.warn("Received empty top anime data from API");
        } else {
          console.log(`Received ${topData.length} top anime items from API`);
          const mappedTopData = topData.map(mapAnimeData);
          setTopAnime(mappedTopData.slice(0, 5)); // Only take the first 5 for the explore page
        }
        
        // Process trending anime data
        if (!trendingData || trendingData.length === 0) {
          console.warn("Received empty trending anime data from API");
        } else {
          console.log(`Received ${trendingData.length} trending anime items from API`);
          const mappedTrendingData = trendingData.map(mapAnimeData);
          setTrendingAnime(mappedTrendingData.slice(0, 5)); // Only take the first 5 for the explore page
        }
        
        // Process carousel anime data
        if (!carouselData || carouselData.length === 0) {
          console.warn("Received empty carousel anime data from API");
          setError("No featured anime data available");
        } else {
          console.log(`Received ${carouselData.length} carousel anime items from API`);
          const mappedCarouselData = carouselData.map(mapAnimeData);
          setCarouselAnime(mappedCarouselData);
        }
        
        console.log("Successfully set anime data for explore page");
      } catch (err) {
        console.error("Error fetching anime data:", err);
        setError("Failed to load anime data");
      } finally {
        setLoading(false);
        setCarouselLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Auto-Swipe Carousel Effect with Infinite Scrolling
   * 
   * Implements automatic carousel navigation with seamless infinite loop:
   * - Advances to next slide every AUTO_SWIPE_INTERVAL milliseconds
   * - Uses infinite scrolling technique with duplicate items
   * - Handles seamless transitions at loop boundaries
   * - Cleans up timer on component unmount or dependency changes
   */
  useEffect(() => {
    if (infiniteCarouselData.length === 0) return;

    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        // Scroll to next position
        carouselRef.current?.scrollTo({
          x: width * (nextIndex + 1), // +1 because we start at index 1 (after duplicate)
          animated: true,
        });
        
        return nextIndex;
      });
    }, AUTO_SWIPE_INTERVAL);

    return () => clearInterval(timer);
  }, [infiniteCarouselData.length]);

  /**
   * Initial Carousel Position Effect
   * 
   * Sets the initial scroll position to the first real item (index 1)
   * to properly initialize the infinite scroll mechanism
   */
  useEffect(() => {
    if (infiniteCarouselData.length > 0) {
      // Set initial position to index 1 (first real item after duplicate)
      setTimeout(() => {
        carouselRef.current?.scrollTo({
          x: width,
          animated: false,
        });
        setActiveIndex(0);
      }, 100);
    }
  }, [infiniteCarouselData.length]);

  /**
   * Handle Carousel Scroll End for Infinite Loop
   * 
   * Manages seamless looping by detecting when user reaches boundaries
   * and smoothly transitioning to the opposite end of the carousel
   */
  const handleCarouselScrollEnd = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(scrollX / width);
    
    // Handle infinite loop boundaries
    if (currentIndex === 0) {
      // At the beginning (duplicate of last item), jump to actual last item
      setTimeout(() => {
        carouselRef.current?.scrollTo({
          x: width * carouselAnime.length,
          animated: false,
        });
        setActiveIndex(carouselAnime.length - 1);
      }, 50);
    } else if (currentIndex === infiniteCarouselData.length - 1) {
      // At the end (duplicate of first item), jump to actual first item
      setTimeout(() => {
        carouselRef.current?.scrollTo({
          x: width,
          animated: false,
        });
        setActiveIndex(0);
      }, 50);
    } else {
      // Normal scroll within bounds
      setActiveIndex(currentIndex - 1); // -1 because index 0 is duplicate
    }
  };

  /**
   * Regular anime card press handler
   * Navigates to details page with source tracking for proper back navigation
   */
  const handlePressCard = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id: item.id, title: item.englishName, source: 'explore' }
    });
  };

  /**
   * Carousel item press handler
   * Navigates to details page for featured anime items
   */
  const handlePressCarousel = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id: item.id, title: item.englishName, source: 'explore' }
    });
  };

  /**
   * Renders individual anime cards for trending and top sections
   * 
   * Features:
   * - Poster image with fallback placeholder
   * - Watchlist toggle button with immediate visual feedback
   * - Title with line limiting for consistent layout
   * - Special styling for last card to handle margins
   */
  const renderCard = (item: AnimeItem, type: 'trending' | 'top', index: number, array: AnimeItem[]) => (
    <TouchableOpacity 
      key={`${type}-${item.id}`} 
      style={[
        styles.card,
        index === array.length - 1 ? styles.lastCard : null // Apply lastCard style to the last item
      ]}
      onPress={() => handlePressCard(item)}
    >
      <View style={styles.posterPlaceholder}>
        {/* Poster image with fallback icon */}
        {item.thumbnail ? (
          <Image 
            source={{ uri: item.thumbnail }} 
            style={styles.posterImage}
            resizeMode="cover"
          />
        ) : (
          <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
        )}
        {/* Watchlist toggle button */}
        <TouchableOpacity 
          style={styles.watchlistIcon}
          onPress={(e) => {
            e.stopPropagation(); // Prevent navigation when toggling watchlist
            toggleWatchlist(
              item.id, 
              item.englishName || item.title || 'Unknown Anime', 
              item.thumbnail || ''
            );
          }}
        >
          <MaterialCommunityIcons 
            name={isInWatchlist(item.id) ? "bookmark" : "bookmark-outline"}
            size={24} 
            color={isInWatchlist(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
          />
        </TouchableOpacity>
      </View>
      {/* Anime title with line limiting */}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.englishName || item.title || 'Unknown Anime'}
      </Text>
    </TouchableOpacity>
  );

  /**
   * Renders loading placeholder cards during data fetch
   * Maintains consistent layout while content is loading
   */
  const renderLoadingCard = (index: number, type: 'trending' | 'top', isLast: boolean = false) => (
    <View 
      key={`${type}-loading-${index}`} 
      style={[styles.card, isLast ? styles.lastCard : null]}
    >
      <View style={styles.posterPlaceholder}>
        <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
      </View>
      <View style={styles.loadingTitle} />
    </View>
  );

  /**
   * Renders carousel items with enhanced visual presentation
   * 
   * Features:
   * - Full-width background image
   * - Gradient overlay for text readability
   * - Anime metadata (genre, format, rating)
   * - Pagination dots for visual navigation
   * - Watchlist integration
   */
  const renderCarouselItem = (item: AnimeItem, index: number) => (
    <TouchableOpacity 
      key={`carousel-${item.id}-${index}`} 
      style={styles.carouselItem}
      onPress={() => handlePressCarousel(item)}
    >
      {/* Background image or placeholder */}
      {item.thumbnail ? (
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.carouselImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.carouselItem}>
          <MaterialCommunityIcons name="image-off" size={40} color={Colors.dark.secondaryText} />
          <Text style={styles.placeholderText}>No image available</Text>
        </View>
      )}
      
      {/* Gradient overlay for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(22, 22, 34, 0.7)', 'rgba(22, 22, 34, 0.9)']}
        style={styles.carouselGradient}
      />
      
      {/* Content overlay with anime information */}
      <View style={styles.carouselContent}>
        {/* Anime title */}
        <Text style={styles.carouselTitle} numberOfLines={2}>
          {item.englishName || item.title || 'Unknown Anime'}
        </Text>
        
        {/* Metadata row with genre, format, and rating */}
        <View style={styles.carouselInfo}>
          {item.genres && item.genres.length > 0 && (
            <>
              <Text style={styles.carouselGenre}>
                {item.genres[0]}
              </Text>
              <View style={styles.carouselDot} />
            </>
          )}
          
          {item.format && (
            <>
              <Text style={styles.carouselGenre}>
                {item.format}
              </Text>
              <View style={styles.carouselDot} />
            </>
          )}
          
          {/* Rating with star icon */}
          <View style={styles.carouselRating}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.carouselRatingText}>
              {typeof item.score === 'number' && item.score > 0 
                ? item.score.toFixed(1) 
                : 'N/A'}
            </Text>
          </View>
        </View>
        
        {/* Action buttons */}
        <View style={styles.carouselActions}>
          <TouchableOpacity 
            style={styles.bookmarkButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent navigation when toggling watchlist
              toggleWatchlist(
                item.id, 
                item.englishName || item.title || 'Unknown Anime', 
                item.thumbnail || ''
              );
            }}
          >
            <MaterialCommunityIcons 
              name={isInWatchlist(item.id) ? "bookmark" : "bookmark-outline"}
              size={24} 
              color={isInWatchlist(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Pagination dots for visual navigation indicator */}
      <View style={styles.paginationDots}>
        {carouselAnime.map((_, dotIndex) => (
          <View
            key={dotIndex}
            style={[
              styles.dot,
              dotIndex === activeIndex && styles.activeDot
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" translucent />
      
      {/* Featured Anime Carousel Section */}
      <View style={styles.carouselContainer}>
        {carouselLoading ? (
          /* Carousel loading state */
          <View style={styles.carouselLoadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
            <Text style={[styles.placeholderText, { marginTop: 10 }]}>Loading featured anime...</Text>
          </View>
        ) : infiniteCarouselData.length > 0 ? (
          /* Infinite scrolling carousel with anime items */
          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCarouselScrollEnd}
          >
            {infiniteCarouselData.map((item, index) => renderCarouselItem(item, index))}
          </ScrollView>
        ) : (
          /* Carousel error state */
          <View style={styles.carouselLoadingContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors.dark.buttonBackground} />
            <Text style={[styles.placeholderText, { marginTop: 10 }]}>No featured anime available</Text>
          </View>
        )}
      </View>

      {/* Trending Anime Section */}
      <View style={styles.section}>
        {/* Section header with navigation to full trending page */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending</Text>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => router.push("/(tabs)/trending")}
          >
            <Text style={styles.moreButtonText}>More</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={Colors.dark.buttonBackground} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Horizontal scrolling anime cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {loading ? 
            /* Loading placeholders */
            Array(5).fill(0).map((_, index) => renderLoadingCard(index, 'trending', index === 4)) :
            trendingAnime.length > 0 ? 
              /* Actual trending anime cards */
              trendingAnime.map((item, index, array) => renderCard(item, 'trending', index, array)) :
              error ? (
                /* Error state */
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                /* No data state */
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>No trending anime available</Text>
                </View>
              )
          }
        </ScrollView>
      </View>

      {/* Top Anime Section */}
      <View style={styles.section}>
        {/* Section header with navigation to full top anime page */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top</Text>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => router.push("/(tabs)/top")}
          >
            <Text style={styles.moreButtonText}>More</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={Colors.dark.buttonBackground}
            />
          </TouchableOpacity>
        </View>
        
        {/* Horizontal scrolling anime cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {loading ? 
            /* Loading placeholders */
            Array(5).fill(0).map((_, index) => renderLoadingCard(index, 'top', index === 4)) :
            topAnime.length > 0 ? 
              /* Actual top anime cards */
              topAnime.map((item, index, array) => renderCard(item, 'top', index, array)) :
              error ? (
                /* Error state */
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                /* No data state */
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>No top anime available</Text>
                </View>
              )
          }
        </ScrollView>
      </View>
    </ScrollView>
  );
}
