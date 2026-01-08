// React hooks for state management, lifecycle, and performance optimization
import { useEffect, useState, useRef, useCallback } from "react";

// React Native core components for UI rendering and device interaction
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, BackHandler } from "react-native";

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Expo Router hooks for navigation and parameter access
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';

// Application color constants for consistent theming
import Colors from "../constants/Colors";

// API utilities for fetching anime and manga search data
import { animeApi, mangaApi } from "../lib/api";

// TypeScript interfaces for type safety
import { AnimeItem } from "../types/anime";

// Status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// AsyncStorage for local data persistence and caching
import AsyncStorage from "@react-native-async-storage/async-storage";

// Component-specific styles
import { styles } from "../styles/searchResults.styles";

// Watchlist context for managing user's saved anime
import { useWatchlist } from "../contexts/WatchlistContext";

/**
 * AsyncStorage Constants
 * 
 * Keys for storing search results and parameters locally to provide:
 * - Instant result restoration when returning from detail pages
 * - Offline search result viewing
 * - Reduced API calls for repeated searches
 * - Improved user experience with faster navigation
 * Separate keys for anime and manga to prevent cache conflicts
 */
// Constants for AsyncStorage (separate for anime and manga)
const getSearchResultsStorageKey = (type: 'anime' | 'manga') => `search_results_cache_${type}`;
const getSearchParamsStorageKey = (type: 'anime' | 'manga') => `search_params_cache_${type}`;

/**
 * SearchResults Component
 * 
 * Comprehensive search results display that provides:
 * - Multi-parameter search support (text query + genre filters)
 * - Intelligent result caching with AsyncStorage
 * - Automatic result restoration on screen focus
 * - Loading, error, and empty states
 * - Watchlist integration for quick bookmarking
 * - Navigation to detailed anime information
 * - Android hardware back button handling
 * - Performance optimization with debounced focus events
 */
export default function SearchResults() {
  // Extract search parameters from route
  const params = useLocalSearchParams();
  const queryParam = params.query as string || '';
  const genresParam = params.genres ? (params.genres as string).split(',') : [];
  const searchType = (params.type as 'anime' | 'manga') || 'anime';
  
  // State variables for search results and UI
  const [results, setResults] = useState<any[]>([]); // Search result list (anime or manga)
  const [loading, setLoading] = useState(true); // Loading state for API calls
  const [error, setError] = useState<string | null>(null); // Error state for failed requests
  const [watchlist, setWatchlist] = useState<string[]>([]); // Legacy local watchlist state for compatibility
  const [hasSearched, setHasSearched] = useState(false); // Flag to track if search has been performed
  
  // Use watchlist context for global state management
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  
  // Refs for component lifecycle and performance optimization
  const initialMount = useRef(true); // Track initial mount to prevent duplicate searches
  const lastFocusTime = useRef<number>(0); // Debounce focus events to prevent loops
  const noResultsFound = useRef(false); // Track when we've confirmed no results exist

  /**
   * Search Results Persistence - Save Function
   * 
   * Saves successful search results and parameters to AsyncStorage for:
   * - Instant restoration when returning from detail pages
   * - Offline viewing of previous search results
   * - Reduced API calls for repeated identical searches
   * 
   * @param searchResults - Array of anime items to cache
   * @param query - Text search query used
   * @param genres - Genre filters applied
   */
  // Save search results to AsyncStorage
  const saveSearchResults = async (searchResults: AnimeItem[], query: string, genres: string[]) => {
    try {
      await AsyncStorage.setItem(getSearchResultsStorageKey(searchType), JSON.stringify(searchResults));
      await AsyncStorage.setItem(getSearchParamsStorageKey(searchType), JSON.stringify({ query, genres }));
      console.log('Successfully saved search results to AsyncStorage');
    } catch (error) {
      console.error('Error saving search results:', error);
    }
  };

  /**
   * Search Results Persistence - Load Function
   * 
   * Loads cached search results from AsyncStorage with intelligent parameter matching:
   * - Returns most recent results if no current search parameters (returning from details)
   * - Validates parameter matching for cached result relevance
   * - Prevents unnecessary API calls for identical searches
   * 
   * @returns boolean indicating if cached results were successfully restored
   */
  // Load search results from AsyncStorage
  const loadSearchResults = async () => {
    try {
      console.log('Attempting to load search results from AsyncStorage...');
      const resultsJson = await AsyncStorage.getItem(getSearchResultsStorageKey(searchType));
      const paramsJson = await AsyncStorage.getItem(getSearchParamsStorageKey(searchType));
      
      if (resultsJson && paramsJson) {
        const savedResults = JSON.parse(resultsJson) as AnimeItem[];
        const savedParams = JSON.parse(paramsJson) as { query: string, genres: string[] };
        
        console.log('Found stored results:', { 
          resultCount: savedResults.length,
          savedQuery: savedParams.query, 
          savedGenres: savedParams.genres,
          currentQuery: queryParam,
          currentGenres: genresParam
        });
        
        // Case 1: Empty query params - likely returning from details page
        // Use the most recent search results regardless of parameters
        if (!queryParam && genresParam.length === 0) {
          console.log('No search parameters provided, using most recent search results');
          setResults(savedResults);
          setError(null);
          setLoading(false);
          setHasSearched(true);
          return true;
        }
        
        // Case 2: We have query params - check if they match the saved params
        // Check if current search parameters match the cached parameters
        const queriesMatch = savedParams.query === queryParam;
        const genresMatch = 
          savedParams.genres.length === genresParam.length && 
          savedParams.genres.every(g => genresParam.includes(g));
        
        // Only use cached results if both query and genres match exactly
        if (queriesMatch && genresMatch && savedResults.length > 0) {
          console.log('Restored search results from AsyncStorage - parameters match');
          setResults(savedResults);
          setError(null);
          setLoading(false);
          setHasSearched(true);
          return true;
        } else {
          console.log('Search parameters changed, not using cached results');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading search results:', error);
      return false;
    }
  };

  /**
   * Primary Search Function
   * 
   * Performs API search based on provided parameters with intelligent endpoint selection:
   * - Text only search: uses query-specific endpoint
   * - Genre only search: uses filter-specific endpoint
   * - Combined search: uses combined query and filter endpoint
   * - Handles all error states and empty results
   * - Caches successful results for future use
   */
  // Perform a search with the given query and genres
  const performSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Clear previous results immediately when starting a new search
    setResults([]);
    
    try {
      // If we don't have valid search parameters, don't perform search
      if (!queryParam && genresParam.length === 0) {
        setLoading(false);
        setHasSearched(true);
        setResults([]);
        return;
      }
      
      let searchResults: any[] = [];
      
      // Determine which API endpoint to use based on search type and parameters
      if (searchType === 'manga') {
        if (queryParam && genresParam.length > 0) {
          searchResults = await mangaApi.searchMangaByQueryAndFilters(queryParam, genresParam);
        } else if (genresParam.length > 0) {
          searchResults = await mangaApi.searchMangaByFilters(genresParam);
        } else if (queryParam) {
          searchResults = await mangaApi.searchMangaByQuery(queryParam);
        }
      } else {
        // Anime search
        if (queryParam && genresParam.length > 0) {
          searchResults = await animeApi.searchAnimeByQueryAndFilters(queryParam, genresParam);
        } else if (genresParam.length > 0) {
          searchResults = await animeApi.searchAnimeByFilters(genresParam);
        } else if (queryParam) {
          searchResults = await animeApi.searchAnimeByQuery(queryParam);
        }
      }
      
      if (!searchResults || searchResults.length === 0) {
        setError('No results found. Try different search terms or filters.');
        setResults([]);
        noResultsFound.current = true; // Mark that we've confirmed no results exist
      } else {
        // Save the successful search results to AsyncStorage
        await saveSearchResults(searchResults, queryParam, genresParam);
        setResults(searchResults);
        setError(null);
        noResultsFound.current = false; // Reset flag since we found results
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to load search results. Please try again.');
      setResults([]);
      noResultsFound.current = true; // Mark error state as no results
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [queryParam, genresParam, searchType]);

  /**
   * Initial Search Effect
   * 
   * Handles component initialization with intelligent caching:
   * - Attempts to load cached results first for performance
   * - Falls back to new API search if cache miss or parameter mismatch
   * - Prevents duplicate searches on mount
   * - Handles edge cases with no search parameters
   */
  // Initial search on component mount
  useEffect(() => {
    const initSearch = async () => {
      if (initialMount.current) {
        initialMount.current = false;
        
        if (queryParam || genresParam.length > 0) {
          console.log('Initial search on mount', { query: queryParam, genres: genresParam });
          // Try to load from storage first
          const foundInStorage = await loadSearchResults();
          if (!foundInStorage) {
            // If not in storage, perform new search
            await performSearch();
          }
        } else {
          setLoading(false);
          setHasSearched(true);
        }
      }
    };
    
    initSearch();
  }, []);

  /**
   * Screen Focus Effect
   * 
   * Handles result restoration when returning from detail pages:
   * - Debounces rapid successive focus events to prevent loops
   * - Restores cached results without showing loading spinner
   * - Performs new search only if necessary and no confirmed empty results
   * - Optimizes user experience during navigation
   */
  // Handle screen focus - restore search results but with debounce to prevent loops
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      
      // Prevent multiple rapid successive focus events (debounce by 500ms)
      if (now - lastFocusTime.current < 500) {
        return;
      }
      
      lastFocusTime.current = now;
      
      const restoreResults = async () => {
        if (!initialMount.current) {
          // On subsequent focuses (like returning from details page)
          console.log('Screen focused, attempting to restore search results');
          
          // Don't show loading state when returning from details page
          // This prevents the flickering of loading indicator
          if (results.length === 0 && !noResultsFound.current) {
            setLoading(true);
          }
          
          // Only try to restore or search if we haven't explicitly confirmed no results
          if (!noResultsFound.current) {
            const loaded = await loadSearchResults();
            
            if (!loaded && (queryParam || genresParam.length > 0) && !noResultsFound.current) {
              // If we couldn't load from storage but have search parameters, do a new search
              // but only if we haven't already confirmed no results exist
              console.log('Could not restore from cache, performing new search');
              await performSearch();
            }
          }
          setLoading(false);
        }
      };
      
      restoreResults();
    }, [queryParam, genresParam, performSearch, results.length, noResultsFound.current])
  );

  /**
   * Android Hardware Back Button Handler
   * 
   * Ensures proper navigation flow on Android devices.
   * Always returns to search page regardless of navigation stack state.
   */
  // Handle Android hardware back button to navigate to search page
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  /**
   * Back Navigation Handler
   * 
   * Provides consistent navigation back to search page.
   * Maintains proper app flow and user expectations.
   */
  // Back button handler: always return to the search tab with the current search type
  const handleGoBack = () => {
    router.replace({
      pathname: '/(tabs)/search',
      params: { type: searchType }
    });
    return true;
  };

  /**
   * Card Press Handler
   * 
   * Navigates to details page (anime or manga) with comprehensive data passing:
   * - Passes ID and title for API calls
   * - Includes source tracking for analytics
   * - Encodes complete data for immediate display
   * - Optimizes detail page loading experience
   */
  const handlePressCard = (item: any) => {
    const sharedParams: Record<string, string> = { type: searchType };
    if (queryParam) sharedParams.query = queryParam;
    if (genresParam.length > 0) sharedParams.genres = genresParam.join(',');

    if (searchType === 'manga') {
      router.push({
        pathname: "/(tabs)/manga-details",
        params: { 
          id: item.id, 
          title: item.englishName || item.title,
          source: 'search',
          ...sharedParams,
          completeData: encodeURIComponent(JSON.stringify(item))
        }
      });
    } else {
      router.push({
        pathname: "/(tabs)/details",
        params: { 
          id: item.id, 
          title: item.englishName || item.title,
          source: 'search',
          ...sharedParams,
          completeData: encodeURIComponent(JSON.stringify(item))
        }
      });
    }
  };

  /**
   * Watchlist Toggle Handler
   * 
   * Manages adding/removing anime from user's watchlist:
   * - Prevents event bubbling to avoid card navigation
   * - Updates both local state (compatibility) and global context
   * - Provides immediate UI feedback
   * - Handles missing anime data gracefully
   */
  // Update toggleWatchlist function to use both local state and context
  const handleToggleWatchlist = (id: string, event: any) => {
    event.stopPropagation();
    
    // Keep local state for compatibility
    setWatchlist(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
    
    // Find the item to get its details
    const item = results.find(result => result.id === id);
    if (item) {
      // Use the context function to update global state
      toggleWatchlist(
        id, 
        item.englishName || item.title || 'Unknown Anime', 
        item.thumbnail || ''
      );
    }
  };

  /**
   * Search Result Item Renderer
   * 
   * Renders individual anime cards with comprehensive information:
   * - Thumbnail with fallback placeholder
   * - Title with line limiting for consistent layout
   * - Status badges (type, status, rating)
   * - Score with star icon
   * - Watchlist toggle with visual state feedback
   * - Proper touch handling for navigation and actions
   */
  const renderItem = ({ item }: { item: AnimeItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePressCard(item)}>
      {/* Thumbnail container with image or placeholder */}
      <View style={styles.thumbnailContainer}>
        {item.thumbnail ? (
          <Image 
            source={{ uri: item.thumbnail }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
          </View>
        )}
      </View>
      
      {/* Content container with title and metadata */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {item.englishName || item.title || 'Unknown Anime'}
        </Text>
        
        {/* Information badges container */}
        <View style={styles.infoContainer}>
          {/* Type Badge */}
          {item.type && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.type}</Text>
            </View>
          )}
          
          {/* Status Badge */}
          {item.status && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          )}
          
          {/* Rating Badge */}
          {item.rating && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.rating}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Right container with bookmark and score */}
      <View style={styles.rightContainer}>
        <TouchableOpacity 
          style={styles.bookmarkButton}
          onPress={(e) => handleToggleWatchlist(item.id, e)}
        >
          <MaterialCommunityIcons 
            name={isInWatchlist(item.id) ? "bookmark" : "bookmark-outline"}
            size={24} 
            color={isInWatchlist(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
          />
        </TouchableOpacity>
        
        {/* Score moved below bookmark button */}
        {item.score && (
          <View style={styles.scoreContainer}>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.scoreText}>{item.score.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  /**
   * Empty State Render
   * 
   * Displays helpful message when no search parameters are provided.
   * Guides users to use search functionality.
   */
  // Show empty state if no search parameters were provided and no results
  if (hasSearched && !loading && !error && results.length === 0 && (!queryParam && genresParam.length === 0)) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent />
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Results</Text>
        </View>
        
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify" size={64} color={Colors.dark.secondaryText} />
          <Text style={styles.emptyText}>
            Use search or filters to find {searchType === 'manga' ? 'manga' : 'anime'}
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Main Search Results Render
   * 
   * Displays search results with proper state handling:
   * - Loading state with spinner and message
   * - Error state with icon and retry option
   * - Results list with count and scrollable interface
   * - Dynamic header showing search context
   */
  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Header with back button and dynamic title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {queryParam && genresParam.length > 0 ? `"${queryParam}" in ${genresParam.length} genres` : 
           queryParam ? `Results for "${queryParam}"` : 
           genresParam.length > 0 ? `${genresParam.length} genres selected` : 'Search Results'}
        </Text>
      </View>
      
      {/* Conditional content based on state */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.dark.buttonBackground} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {/* Results count and list */}
          <Text style={styles.resultsCount}>
            {results.length} {searchType === 'manga' ? 'manga' : 'anime'} found
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}