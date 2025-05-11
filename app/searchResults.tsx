import { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, BackHandler } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Colors from "../constants/Colors";
import { animeApi } from "../lib/api";
import { AnimeItem } from "../types/anime";
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "../styles/searchResults.styles";
import { useWatchlist } from "../contexts/WatchlistContext";

// Constants for AsyncStorage
const SEARCH_RESULTS_STORAGE_KEY = 'search_results_cache';
const SEARCH_PARAMS_STORAGE_KEY = 'search_params_cache';

export default function SearchResults() {
  const params = useLocalSearchParams();
  const queryParam = params.query as string || '';
  const genresParam = params.genres ? (params.genres as string).split(',') : [];
  
  // State variables
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]); // Keep for compatibility
  const [hasSearched, setHasSearched] = useState(false);
  
  // Use watchlist context
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  
  // Refs to keep track of mount state and prevent duplicate focus effects
  const initialMount = useRef(true);
  const lastFocusTime = useRef<number>(0);

  // Save search results to AsyncStorage
  const saveSearchResults = async (searchResults: AnimeItem[], query: string, genres: string[]) => {
    try {
      await AsyncStorage.setItem(SEARCH_RESULTS_STORAGE_KEY, JSON.stringify(searchResults));
      await AsyncStorage.setItem(SEARCH_PARAMS_STORAGE_KEY, JSON.stringify({ query, genres }));
      console.log('Successfully saved search results to AsyncStorage');
    } catch (error) {
      console.error('Error saving search results:', error);
    }
  };

  // Load search results from AsyncStorage
  const loadSearchResults = async () => {
    try {
      console.log('Attempting to load search results from AsyncStorage...');
      const resultsJson = await AsyncStorage.getItem(SEARCH_RESULTS_STORAGE_KEY);
      const paramsJson = await AsyncStorage.getItem(SEARCH_PARAMS_STORAGE_KEY);
      
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
      
      let searchResults: AnimeItem[] = [];
      
      // Determine which API endpoint to use based on search parameters
      if (queryParam && genresParam.length > 0) {
        // Both query and filters
        searchResults = await animeApi.searchAnimeByQueryAndFilters(queryParam, genresParam);
      } else if (genresParam.length > 0) {
        // Only filters
        searchResults = await animeApi.searchAnimeByFilters(genresParam);
      } else if (queryParam) {
        // Only query
        searchResults = await animeApi.searchAnimeByQuery(queryParam);
      }
      
      if (!searchResults || searchResults.length === 0) {
        setError('No results found. Try different search terms or filters.');
        setResults([]);
      } else {
        // Save the successful search results to AsyncStorage
        await saveSearchResults(searchResults, queryParam, genresParam);
        setResults(searchResults);
        setError(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to load search results. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [queryParam, genresParam]);

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
          if (results.length === 0) {
            setLoading(true);
          }
          
          const loaded = await loadSearchResults();
          
          if (!loaded && (queryParam || genresParam.length > 0)) {
            // If we couldn't load from storage but have search parameters, do a new search
            console.log('Could not restore from cache, performing new search');
            await performSearch();
          }
          setLoading(false);
        }
      };
      
      restoreResults();
    }, [queryParam, genresParam, performSearch])
  );

  // Handle Android hardware back button to navigate to search page
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Modified back button handler to ensure we always go back to the search page
  const handleGoBack = () => {
    router.push('/(tabs)/search');
    return true;
  };

  const handlePressCard = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { 
        id: item.id, 
        title: item.englishName || item.title,
        source: 'search',
        completeData: encodeURIComponent(JSON.stringify(item))
      }
    });
  };

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

  const renderItem = ({ item }: { item: AnimeItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePressCard(item)}>
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
      
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {item.englishName || item.title || 'Unknown Anime'}
        </Text>
        
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
          <Text style={styles.emptyText}>Use search or filters to find anime</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
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
          <Text style={styles.resultsCount}>{results.length} anime found</Text>
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