import { useState } from "react";
import { View, SafeAreaView, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { SearchBar } from "../../components";
import { styles } from "../../styles/search.styles";
import { StatusBar } from 'expo-status-bar';

// Define genre data with icons and labels based on the provided image
const genres = [
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

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Attack on Titan",
    "One Piece",
    "Demon Slayer",
    "Jujutsu Kaisen"
  ]);

  const handleSearch = () => {
    if (searchQuery.trim() || selectedGenres.length > 0) {
      // Add to recent searches if text query is present and not already in the list
      if (searchQuery.trim() && !recentSearches.includes(searchQuery.trim())) {
        setRecentSearches(prev => [searchQuery.trim(), ...prev]);
      }
      console.log('Searching for:', searchQuery);
      console.log('Selected genres:', selectedGenres);
      
      // Here we would call the appropriate API endpoint based on whether
      // we have a text query, genre filters, or both
    }
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  const removeSearch = (index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllSearches = () => {
    setRecentSearches([]);
  };

  const clearFilters = () => {
    setSelectedGenres([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" translucent />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Search</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearch}
          />
          <TouchableOpacity 
            style={[styles.searchButton, (!searchQuery && !selectedGenres.length) ? styles.searchButtonDisabled : null]} 
            onPress={handleSearch}
            disabled={!searchQuery && !selectedGenres.length}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        {/* Genres Section Header with Clear Filters Button */}
        <View style={styles.genresHeader}>
          <Text style={styles.sectionTitle}>Filters</Text>
          {selectedGenres.length > 0 && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearButton}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Genres Section - Now Horizontal Scroll */}
        <View style={styles.genresSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.genresScrollContent}
          >
            {genres.map(genre => (
              <TouchableOpacity 
                key={genre.id}
                style={[
                  styles.genreBox,
                  selectedGenres.includes(genre.id) ? styles.genreBoxSelected : null
                ]}
                onPress={() => toggleGenre(genre.id)}
              >
                <MaterialCommunityIcons 
                  name={genre.icon as any} 
                  size={24} 
                  color={selectedGenres.includes(genre.id) ? Colors.dark.buttonBackground : Colors.dark.text} 
                />
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

        {/* Recent Searches Section */}
        {recentSearches.length > 0 && (
          <View style={styles.recentContainer}>
            <View style={styles.genresHeader}>
              <Text style={styles.sectionTitle}>Recents</Text>
              <TouchableOpacity onPress={clearAllSearches}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentList}>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentItem}
                  onPress={() => setSearchQuery(search)}
                >
                  <View style={styles.recentItemContent}>
                    <MaterialCommunityIcons
                      name="history"
                      size={20}
                      color={Colors.dark.secondaryText}
                      style={styles.historyIcon}
                    />
                    <Text style={styles.recentText} numberOfLines={1}>
                      {search}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeSearch(index)}
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
