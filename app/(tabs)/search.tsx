import { useState, useEffect } from "react";
import { View, SafeAreaView, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import Colors from "../../constants/Colors";
import { SearchBar } from "../../components";
import { styles } from "../../styles/search.styles";
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Genre Definitions
 * 
 * Comprehensive list of anime genres with associated icons and labels.
 * Each genre includes:
 * - id: Unique identifier for API queries
 * - label: Human-readable display name
 * - icon: MaterialCommunityIcons name for visual representation
 */
// Anime genres
const animeGenres = [
  { id: "action", label: "Action", icon: "sword" },
  { id: "adventure", label: "Adventure", icon: "hiking" },
  { id: "comedy", label: "Comedy", icon: "emoticon-happy" },
  { id: "cars", label: "Cars", icon: "car" },
  { id: "dementia", label: "Dementia", icon: "brain" },
  { id: "demons", label: "Demons", icon: "ghost" },
  { id: "drama", label: "Drama", icon: "drama-masks" },
  { id: "ecchi", label: "Ecchi", icon: "heart-flash" },
  { id: "fantasy", label: "Fantasy", icon: "auto-fix" },
  { id: "game", label: "Game", icon: "gamepad-variant" },
  { id: "harem", label: "Harem", icon: "account-multiple" },
  { id: "historical", label: "Historical", icon: "book-open-page-variant" },
  { id: "horror", label: "Horror", icon: "ghost" },
  { id: "isekai", label: "Isekai", icon: "transit-transfer" },
  { id: "josei", label: "Josei", icon: "human-female" },
  { id: "kids", label: "Kids", icon: "human-child" },
  { id: "magic", label: "Magic", icon: "magic-staff" },
  { id: "martial-arts", label: "Martial Arts", icon: "karate" },
  { id: "mecha", label: "Mecha", icon: "robot" },
  { id: "military", label: "Military", icon: "shield" },
  { id: "music", label: "Music", icon: "music" },
  { id: "mystery", label: "Mystery", icon: "magnify" },
  { id: "parody", label: "Parody", icon: "theater" },
  { id: "police", label: "Police", icon: "police-badge" },
  { id: "psychological", label: "Psychological", icon: "brain" },
  { id: "romance", label: "Romance", icon: "heart" },
  { id: "samurai", label: "Samurai", icon: "knife-military" },
  { id: "school", label: "School", icon: "school" },
  { id: "sci-fi", label: "Sci-Fi", icon: "rocket" },
  { id: "seinen", label: "Seinen", icon: "human-male" },
  { id: "shoujo", label: "Shoujo", icon: "human-female" },
  { id: "shoujo-ai", label: "Shoujo Ai", icon: "account-heart" },
  { id: "shounen", label: "Shounen", icon: "human-male" },
  { id: "shounen-ai", label: "Shounen Ai", icon: "account-heart" },
  { id: "slice-of-life", label: "Slice of Life", icon: "food-apple" },
  { id: "space", label: "Space", icon: "rocket-launch" },
  { id: "sports", label: "Sports", icon: "basketball" },
  { id: "super-power", label: "Super Power", icon: "flash" },
  { id: "supernatural", label: "Supernatural", icon: "ghost-outline" },
  { id: "thriller", label: "Thriller", icon: "timer-sand" },
  { id: "vampire", label: "Vampire", icon: "needle" },
  { id: "yaoi", label: "Yaoi", icon: "account-multiple" },
  { id: "yuri", label: "Yuri", icon: "account-heart-outline" },
  { id: "unknown", label: "Unknown", icon: "help-circle" }
];

// Manga genres
const mangaGenres = [
  { id: "action", label: "Action", icon: "sword" },
  { id: "adventure", label: "Adventure", icon: "hiking" },
  { id: "comedy", label: "Comedy", icon: "emoticon-happy" },
  { id: "drama", label: "Drama", icon: "drama-masks" },
  { id: "fantasy", label: "Fantasy", icon: "auto-fix" },
  { id: "horror", label: "Horror", icon: "ghost" },
  { id: "isekai", label: "Isekai", icon: "transit-transfer" },
  { id: "romance", label: "Romance", icon: "heart" },
  { id: "psychological", label: "Psychological", icon: "brain" },
  { id: "mystery", label: "Mystery", icon: "magnify" },
  { id: "thriller", label: "Thriller", icon: "timer-sand" },
  { id: "shounen", label: "Shounen", icon: "human-male" },
  { id: "shoujo", label: "Shoujo", icon: "human-female" },
  { id: "seinen", label: "Seinen", icon: "human-male" },
  { id: "josei", label: "Josei", icon: "human-female" },
  { id: "slice-of-life", label: "Slice of Life", icon: "food-apple" },
  { id: "school", label: "School", icon: "school" },
  { id: "supernatural", label: "Supernatural", icon: "ghost-outline" },
  { id: "martial-arts", label: "Martial Arts", icon: "karate" },
  { id: "historical", label: "Historical", icon: "book-open-page-variant" },
  { id: "sci-fi", label: "Sci-Fi", icon: "rocket" },
  { id: "mecha", label: "Mecha", icon: "robot" },
  { id: "magic", label: "Magic", icon: "magic-staff" },
  { id: "sports", label: "Sports", icon: "basketball" },
  { id: "super-power", label: "Super Power", icon: "flash" },
  { id: "game", label: "Game", icon: "gamepad-variant" },
  { id: "harem", label: "Harem", icon: "account-multiple" },
  { id: "ecchi", label: "Ecchi", icon: "heart-flash" },
  { id: "vampire", label: "Vampire", icon: "needle" },
  { id: "yaoi", label: "Yaoi", icon: "account-multiple" },
  { id: "yuri", label: "Yuri", icon: "account-heart-outline" },
  { id: "shounen-ai", label: "Shounen Ai", icon: "account-heart" },
  { id: "manhwa", label: "Manhwa", icon: "book-open-page-variant" },
  { id: "manhua", label: "Manhua", icon: "book-open-page-variant-outline" },
  { id: "webtoons", label: "Webtoons", icon: "web" },
  { id: "reincarnation", label: "Reincarnation", icon: "refresh" },
  { id: "post-apocalyptic", label: "Post Apocalyptic", icon: "city-variant-outline" },
  { id: "gender-bender", label: "Gender Bender", icon: "gender-male-female" },
  { id: "cooking", label: "Cooking", icon: "food" },
  { id: "medical", label: "Medical", icon: "medical-bag" },
  { id: "military", label: "Military", icon: "shield" },
  { id: "music", label: "Music", icon: "music" },
  { id: "parody", label: "Parody", icon: "theater" },
  { id: "police", label: "Police", icon: "police-badge" },
  { id: "samurai", label: "Samurai", icon: "knife-military" },
  { id: "4-koma", label: "4 Koma", icon: "grid" },
  { id: "doujinshi", label: "Doujinshi", icon: "book-open" },
  { id: "one-shot", label: "One Shot", icon: "numeric-1-circle" },
  { id: "mature", label: "Mature", icon: "alert-circle" },
  { id: "tragedy", label: "Tragedy", icon: "emoticon-sad" },
  { id: "suspense", label: "Suspense", icon: "timer-sand" },
  { id: "zombies", label: "Zombies", icon: "skull" },
  { id: "monster-girls", label: "Monster Girls", icon: "ghost" },
  { id: "youkai", label: "Youkai", icon: "ghost-outline" },
  { id: "demons", label: "Demons", icon: "ghost" },
  { id: "crossdressing", label: "Crossdressing", icon: "hanger" },
  { id: "gyanu", label: "Gyanu", icon: "account-question" },
  { id: "cars", label: "Cars", icon: "car" },
  { id: "space", label: "Space", icon: "rocket-launch" },
  { id: "dementia", label: "Dementia", icon: "brain" },
  { id: "unknown", label: "Unknown", icon: "help-circle" }
];

// Storage keys for recent searches persistence (separate for anime and manga)
const RECENT_ANIME_SEARCHES_KEY = 'recent_anime_searches';
const RECENT_MANGA_SEARCHES_KEY = 'recent_manga_searches';

/**
 * Search Component
 * 
 * Main search interface that provides:
 * - Text-based anime search with auto-complete suggestions
 * - Genre-based filtering with multi-selection capability
 * - Recent searches history with local storage persistence
 * - Combined search queries with both text and genre filters
 * - Navigation to search results with proper parameter passing
 */
export default function Search() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialSearchType = (params.type === 'manga' ? 'manga' : 'anime') as 'anime' | 'manga';
  
  // State for search input and filters
  const [searchQuery, setSearchQuery] = useState(""); // Current search text input
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]); // Selected genre filters
  const [recentSearches, setRecentSearches] = useState<string[]>([]); // Persisted recent search history
  const [searchType, setSearchType] = useState<'anime' | 'manga'>(initialSearchType); // Toggle between anime and manga search

  /**
   * Recent Searches Loading Effect
   * 
   * Loads previously saved search history from AsyncStorage on component mount.
   * Provides persistence across app sessions for better user experience.
   */
  // Load recent searches from AsyncStorage based on search type
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const storageKey = searchType === 'anime' ? RECENT_ANIME_SEARCHES_KEY : RECENT_MANGA_SEARCHES_KEY;
        const storedSearches = await AsyncStorage.getItem(storageKey);
        if (storedSearches) {
          setRecentSearches(JSON.parse(storedSearches));
        } else {
          setRecentSearches([]);
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    };

    loadRecentSearches();
    // Clear selected genres when switching search type
    setSelectedGenres([]);
  }, [searchType]);

  /**
   * Recent Searches Persistence Effect
   * 
   * Automatically saves recent searches to AsyncStorage whenever the list changes.
   * Ensures search history is preserved across app sessions (separate for anime/manga).
   */
  // Save recent searches to AsyncStorage whenever they change
  useEffect(() => {
    const saveRecentSearches = async () => {
      try {
        const storageKey = searchType === 'anime' ? RECENT_ANIME_SEARCHES_KEY : RECENT_MANGA_SEARCHES_KEY;
        await AsyncStorage.setItem(storageKey, JSON.stringify(recentSearches));
      } catch (error) {
        console.error('Error saving recent searches:', error);
      }
    };

    saveRecentSearches();
  }, [recentSearches, searchType]);

  /**
   * Primary Search Handler
   * 
   * Processes search requests with both text queries and genre filters.
   * Features:
   * - Validates search input (text or genres required)
   * - Updates recent searches history (text queries only)
   * - Formats parameters for API consumption
   * - Navigates to search results page with proper parameters
   */
  const handleSearch = () => {
    if (searchQuery.trim() || selectedGenres.length > 0) {
      // Add to recent searches if text query is present and not already in the list
      if (searchQuery.trim() && !recentSearches.includes(searchQuery.trim())) {
        // Add to beginning of array, limit to 10 recent searches
        const updatedSearches = [searchQuery.trim(), ...recentSearches].slice(0, 10);
        setRecentSearches(updatedSearches);
      }
      
      // Navigate to search results page with query and/or genre filters
      const params: Record<string, string> = {};
      
      // Add text query parameter if present
      if (searchQuery.trim()) {
        params.query = searchQuery.trim();
      }
      
      // Add genre filters parameter if any genres selected
      if (selectedGenres.length > 0) {
        // Get the appropriate genre list based on search type
        const genreList = searchType === 'anime' ? animeGenres : mangaGenres;
        // Format selected genres as comma-separated list
        const formattedGenres = selectedGenres.map(genreId => {
          // Convert genre IDs to labels for the API
          const genre = genreList.find(g => g.id === genreId);
          return genre ? genre.label : genreId;
        }).join(',');
        
        params.genres = formattedGenres;
      }
      
      // Add search type parameter
      params.type = searchType;
      
      // Navigate to search results with formatted parameters
      router.push({
        pathname: "/searchResults",
        params
      });
    }
  };

  /**
   * Genre Selection Toggle Handler
   * 
   * Manages multi-selection of genre filters.
   * Adds genre if not selected, removes if already selected.
   * Supports multiple genre filtering for refined search results.
   */
  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId) // Remove if already selected
        : [...prev, genreId] // Add if not selected
    );
  };

  /**
   * Individual Recent Search Removal Handler
   * 
   * Removes a specific search from the recent searches list.
   * Provides granular control over search history management.
   */
  const removeSearch = (index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Clear All Recent Searches Handler
   * 
   * Removes entire recent searches history.
   * Provides bulk cleanup option for users.
   */
  const clearAllSearches = () => {
    setRecentSearches([]);
  };

  /**
   * Clear Genre Filters Handler
   * 
   * Resets all selected genre filters.
   * Allows users to start fresh with genre selection.
   */
  const clearFilters = () => {
    setSelectedGenres([]);
  };

  /**
   * Recent Search Item Press Handler
   * 
   * Handles tapping on a recent search item.
   * Features:
   * - Sets search query to selected item
   * - Updates recent searches order (moves to top)
   * - Immediately navigates to search results
   * - Bypasses state update delays by using direct value
   */
  const handleSearchItemPress = (search: string) => {
    // First set the search query for UI consistency
    setSearchQuery(search);
    
    // Use the search value directly instead of relying on state update
    if (search.trim()) {
      // Add to recent searches if not already in the list
      if (!recentSearches.includes(search.trim())) {
        const updatedSearches = [search.trim(), ...recentSearches].slice(0, 10);
        setRecentSearches(updatedSearches);
      }
      
      // Navigate directly to search results with the selected search term
      router.push({
        pathname: "/searchResults",
        params: {
          query: search.trim(),
          type: searchType
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Main scrollable content container */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Page title header */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Search</Text>
        </View>

        {/* Tab toggle for Anime/Manga */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, searchType === 'anime' && styles.tabActive]}
            onPress={() => setSearchType('anime')}
          >
            <Text style={[styles.tabText, searchType === 'anime' && styles.tabTextActive]}>
              Anime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, searchType === 'manga' && styles.tabActive]}
            onPress={() => setSearchType('manga')}
          >
            <Text style={[styles.tabText, searchType === 'manga' && styles.tabTextActive]}>
              Manga
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Search input and button container */}
        <View style={styles.searchContainer}>
          {/* Custom SearchBar component for text input */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearch}
            placeholder={searchType === 'anime' ? 'Search anime...' : 'Search manga...'}
          />
          {/* Search action button with conditional styling */}
          <TouchableOpacity 
            style={[
              styles.searchButton, 
              (!searchQuery && !selectedGenres.length) ? styles.searchButtonDisabled : null
            ]} 
            onPress={handleSearch}
            disabled={!searchQuery && !selectedGenres.length}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        {/* Genre Filters Section Header with Clear Option */}
        <View style={styles.genresHeader}>
          <Text style={styles.sectionTitle}>Filters</Text>
          {/* Conditional clear filters button */}
          {selectedGenres.length > 0 && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearButton}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Horizontal Scrolling Genre Selection */}
        <View style={styles.genresSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.genresScrollContent}
          >
            {/* Render genre selection boxes based on search type */}
            {(searchType === 'anime' ? animeGenres : mangaGenres).map(genre => (
              <TouchableOpacity 
                key={genre.id}
                style={[
                  styles.genreBox,
                  selectedGenres.includes(genre.id) ? styles.genreBoxSelected : null
                ]}
                onPress={() => toggleGenre(genre.id)}
              >
                {/* Genre icon with conditional coloring */}
                <MaterialCommunityIcons 
                  name={genre.icon as any} 
                  size={24} 
                  color={selectedGenres.includes(genre.id) ? Colors.dark.buttonBackground : Colors.dark.text} 
                />
                {/* Genre label with conditional styling */}
                <Text 
                  style={[
                    styles.genreText,
                    selectedGenres.includes(genre.id) ? styles.genreTextSelected : null
                  ]}
                >
                  {genre.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Searches Section - Only shown if history exists */}
        {recentSearches.length > 0 && (
          <View style={styles.recentContainer}>
            {/* Recent searches header with clear all option */}
            <View style={styles.genresHeader}>
              <Text style={styles.sectionTitle}>Recents</Text>
              <TouchableOpacity onPress={clearAllSearches}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Recent searches list */}
            <View style={styles.recentList}>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => handleSearchItemPress(search)}
                >
                  {/* Recent search item content */}
                  <View style={styles.recentItemContent}>
                    {/* History icon indicator */}
                    <MaterialCommunityIcons
                      name="history"
                      size={20}
                      color={Colors.dark.secondaryText}
                      style={styles.historyIcon}
                    />
                    {/* Search term text with line limiting */}
                    <Text style={styles.recentText} numberOfLines={1}>
                      {search}
                    </Text>
                  </View>
                  {/* Individual remove button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent triggering search when removing
                      removeSearch(index);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={Colors.dark.secondaryText}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
