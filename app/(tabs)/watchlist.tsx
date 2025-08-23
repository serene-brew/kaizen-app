// React hooks for state management
import { useState } from "react";

// React Native core components for UI rendering and device interaction
import { Text, View, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from "react-native";

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Expo Router for navigation
import { router } from "expo-router";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Component-specific styles
import { styles } from "../../styles/watchlist.styles";

// Watchlist context for managing user's saved anime
import { useWatchlist } from "../../contexts/WatchlistContext";

// Date formatting utility for displaying when anime was added
import { formatDistanceToNow } from 'date-fns';

// Get device screen width for responsive grid layout
const { width } = Dimensions.get('window');

// Grid layout constants for consistent spacing and sizing
const PADDING = 16; // Container horizontal padding
const GAP = 12; // Gap between grid items
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2; // Calculate card width for 2-column grid (same as trending/top)

/**
 * Watchlist Component
 * 
 * Displays user's saved anime in a responsive grid layout with management features.
 * Features:
 * - Responsive 2-column grid layout matching trending and top pages
 * - Cloud sync functionality always accessible (even when empty)
 * - Sorting options by recent addition or alphabetical name
 * - Individual item removal with visual feedback
 * - Enhanced empty state with sync hint and manual sync option
 * - Loading and syncing states with appropriate indicators
 * - Navigation to anime details with source tracking
 */
export default function Watchlist() {
  // Local state for sorting preference
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent'); // Current sort method
  
  // Extract watchlist functionality from context
  const { watchlist, removeFromWatchlist, sortWatchlist, isLoading, isSyncing, refreshWatchlist, isAuthenticated } = useWatchlist();

  /**
   * Anime Card Press Handler
   * 
   * Navigates to anime details page with proper source tracking
   * for accurate back navigation and analytics.
   */
  const handlePressCard = (id: string, title: string) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title, source: "watchlist" }
    });
  };

  /**
   * Watchlist Removal Handler
   * 
   * Removes anime from user's watchlist with event propagation prevention.
   * Prevents card navigation when removing items from watchlist.
   * Provides immediate UI feedback through context state updates.
   */
  const handleRemoveFromWatchlist = async (id: string, event: any) => {
    event.stopPropagation(); // Prevent triggering card press when removing item
    await removeFromWatchlist(id);
  };

  /**
   * Sort Toggle Handler
   * 
   * Switches between sorting by recent addition and alphabetical name.
   * Updates both local state and watchlist context sorting.
   * Provides visual feedback through icon changes.
   */
  const toggleSort = () => {
    const newSortBy = sortBy === 'recent' ? 'name' : 'recent';
    setSortBy(newSortBy);
    sortWatchlist(newSortBy); // Update context with new sort order
  };
  
  /**
   * Loading State Render
   * Displays loading spinner and text while fetching watchlist data
   */
  // Show loading indicator while fetching watchlist data
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading watchlist...</Text>
      </View>
    );
  }

  /**
   * Syncing State Render
   * Displays syncing indicator during cloud sync operations
   */
  // Show syncing indicator
  if (isSyncing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Refreshing watchlist data...</Text>
      </View>
    );
  }

  /**
   * Empty State Render
   * Displays empty state when user has no saved anime with call-to-action and sync option
   */
  // If watchlist is empty, show the empty state with header
  if (watchlist.length === 0) {
    return (
      <View style={styles.container}>
        {/* Header with sync button - always visible for manual sync */}
        <View style={styles.header}>
          <Text style={styles.title}>My Watchlist</Text>
          <View style={styles.headerButtons}>
            {/* Cloud sync button - available even when empty for manual sync */}
            <TouchableOpacity 
              style={[styles.iconButton, !isAuthenticated && styles.disabledButton]} 
              onPress={refreshWatchlist}
              disabled={!isAuthenticated || isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.dark.text} />
              ) : (
                <MaterialCommunityIcons 
                  name="cloud-sync" 
                  size={24} 
                  color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty state content */}
        <View style={styles.emptyContent}>
          {/* Empty state icon */}
          <MaterialCommunityIcons 
            name="bookmark-off-outline" 
            size={64} 
            color={Colors.dark.secondaryText} 
          />
          {/* Empty state message */}
          <Text style={styles.emptyText}>Your watchlist is empty</Text>
          
          {/* Additional sync message for authenticated users */}
          {isAuthenticated && (
            <Text style={styles.syncHintText}>
              Try syncing with the cloud to restore your watchlist
            </Text>
          )}
          
          {/* Call-to-action button to explore anime */}
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push("/(tabs)/explore")}
          >
            <Text style={styles.exploreButtonText}>Explore Anime</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Main Watchlist Render
   * 
   * Displays saved anime in a responsive grid with management controls.
   * Includes header with sync and sort options, and scrollable grid of anime cards.
   */
  return (
    <View style={styles.container}>
      {/* Watchlist header with title and action buttons */}
      <View style={styles.header}>
        <Text style={styles.title}>My Watchlist</Text>
        <View style={styles.headerButtons}>
          {/* Cloud sync button - disabled if not authenticated */}
          <TouchableOpacity 
            style={[styles.iconButton, !isAuthenticated && styles.disabledButton]} 
            onPress={refreshWatchlist}
            disabled={!isAuthenticated || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.dark.text} />
            ) : (
              <MaterialCommunityIcons 
                name="cloud-sync" 
                size={24} 
                color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} 
              />
            )}
          </TouchableOpacity>
          {/* Sort toggle button with dynamic icon based on current sort */}
          <TouchableOpacity style={styles.iconButton} onPress={toggleSort}>
            <MaterialCommunityIcons 
              name={sortBy === 'recent' ? "sort-clock-descending" : "sort-alphabetical-ascending"} 
              size={24} 
              color={Colors.dark.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable grid container */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Two-column responsive grid layout for watchlist items */}
        <View style={styles.grid}>
          {watchlist.map((item, index) => (
            <TouchableOpacity 
              key={`watchlist-${item.id}`}
              style={styles.card}
              onPress={() => handlePressCard(item.id, item.englishName)}
            >
              {/* Anime poster container with remove button overlay */}
              <View style={styles.posterPlaceholder}>
                {/* Poster image with fallback placeholder */}
                {item.thumbnailUrl ? (
                  <Image 
                    source={{ uri: item.thumbnailUrl }} 
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
                {/* Remove from watchlist button overlaid on poster */}
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={(event) => handleRemoveFromWatchlist(item.id, event)}
                >
                  <MaterialCommunityIcons 
                    name="bookmark-remove" 
                    size={24} 
                    color={Colors.dark.buttonBackground}
                  />
                </TouchableOpacity>
              </View>
              {/* Anime title with line limiting for consistent card height */}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.englishName}
              </Text>
              {/* Date added information with relative time formatting */}
              <Text style={styles.cardSubtitle}>
                Added {formatDistanceToNow(item.dateAdded, { addSuffix: true })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
