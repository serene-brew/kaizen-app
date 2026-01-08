// React hooks for state management, side effects, and performance optimization
import { useState, useEffect, useCallback, memo } from 'react';

// React Native core components for UI rendering and device interaction
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions, BackHandler } from 'react-native';

// Expo Router for navigation
import { Stack, useRouter } from 'expo-router';

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// Application color constants for consistent theming
import Colors from '../../constants/Colors';

// Custom alert system for consistent UI
import { showConfirmAlert, showErrorAlert } from '../../components/CustomAlert';

// Watch history context for managing user's viewing history
import { useWatchHistory, WatchHistoryItem } from '../../contexts/WatchHistoryContext';

// Component-specific styles
import { styles } from '../../styles/history.styles';

// Get device screen width for responsive layout
const { width } = Dimensions.get('window');

/**
 * TypeScript Interface Definitions
 * Define prop structures for component type safety and better development experience
 */

// Type definitions
interface EpisodeItemProps {
  item: WatchHistoryItem; // Individual episode watch data
  onRemove: (animeId: string, episodeNumber: string) => void; // Callback for removing episode from history
  onNavigate: (item: WatchHistoryItem) => void; // Callback for navigating to streaming screen
}

interface AnimeGroupProps {
  animeId: string; // Unique anime identifier
  animeItems: WatchHistoryItem[]; // Array of episodes watched for this anime
  onNavigateToDetails: (animeId: string, animeName: string, thumbnailUrl: string) => void; // Navigate to anime details
  onNavigateToStreaming: (item: WatchHistoryItem) => void; // Navigate to episode streaming
  onRemoveItem: (animeId: string, episodeNumber: string) => void; // Remove specific episode
}

interface HeaderProps {
  onSync: () => void; // Sync history with cloud storage
  onClear: () => void; // Clear all watch history
  isAuthenticated: boolean; // User authentication status
  isSyncing: boolean; // Cloud sync operation status
}

/**
 * Utility Functions
 * Helper functions for data processing and formatting
 */

// Create a unique key for each history item
const createUniqueKey = (item: WatchHistoryItem): string => {
  return `${item.id}-${item.episodeNumber}-${item.audioType}-${item.watchedAt}`;
};

// Format timestamp to readable date
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format progress percentage
const formatProgress = (position: number, duration: number): string => {
  if (!duration) return '0%';
  const percentage = Math.round((position / duration) * 100);
  return `${percentage}%`;
};

/**
 * EpisodeItem Component
 * 
 * Memoized component that renders individual episode watch history entries.
 * Displays episode number, audio type, watch progress, and watch date.
 * Includes remove functionality and navigation to continue watching.
 */
// Memoized Episode Item Component for better performance
const EpisodeItem = memo(({ item, onRemove, onNavigate }: EpisodeItemProps) => {
  return (
    <TouchableOpacity 
      style={styles.episodeItem} 
      onPress={() => onNavigate(item)}
    >
      {/* Episode header with number, audio type, and remove button */}
      <View style={styles.episodeHeader}>
        <View style={styles.episodeDetails}>
          {/* Episode number display */}
          <Text style={styles.episodeNumber}>
            Episode {item.episodeNumber}
          </Text>
          {/* Audio type badge (SUB/DUB) */}
          <View style={styles.audioBadge}>
            <Text style={styles.audioType}>
              {item.audioType.toUpperCase()}
            </Text>
          </View>
        </View>
        {/* Remove episode button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(item.id, item.episodeNumber)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialCommunityIcons 
            name="close" 
            size={16} 
            color={Colors.dark.secondaryText} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Progress bar showing watch completion percentage */}
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${Math.min(100, (item.position / (item.duration || 1)) * 100)}%` }
          ]} 
        />
      </View>
      
      {/* Episode footer with progress percentage and watch date */}
      <View style={styles.episodeFooter}>
        <Text style={styles.progressText}>
          {formatProgress(item.position, item.duration)}
        </Text>
        <Text style={styles.watchDate}>
          {formatDate(item.watchedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

/**
 * AnimeGroup Component
 * 
 * Memoized component that groups episodes by anime series.
 * Displays anime header with thumbnail, title, and episode count.
 * Contains horizontal scrolling list of episodes for this anime.
 */
// Memoized Anime Group Component for better performance
const AnimeGroup = memo(({ animeId, animeItems, onNavigateToDetails, onNavigateToStreaming, onRemoveItem }: AnimeGroupProps) => {
  // Use first item for anime information display
  const firstItem = animeItems[0];
  
  return (
    <View style={styles.animeGroup}>
      {/* Anime header with thumbnail and basic info */}
      <TouchableOpacity 
        style={styles.animeHeader}
        onPress={() => onNavigateToDetails(
          firstItem.id, 
          firstItem.englishName, 
          firstItem.thumbnailUrl
        )}
      >
        {/* Anime thumbnail image */}
        <Image 
          source={{ uri: firstItem.thumbnailUrl}} 
          style={styles.animeThumbnail} 
          defaultSource={require('../../assets/images/icon.png')}
        />
        {/* Anime information display */}
        <View style={styles.animeInfo}>
          {/* Anime title */}
          <Text style={styles.animeName} numberOfLines={1}>
            {firstItem.englishName}
          </Text>
          {/* Episode count summary */}
          <Text style={styles.episodeCount}>
            {animeItems.length} episode{animeItems.length > 1 ? 's' : ''} watched
          </Text>
          {/* Last watched timestamp */}
          <Text style={styles.lastWatched}>
            Last watched: {formatDate(firstItem.watchedAt)}
          </Text>
        </View>
        {/* Navigation arrow */}
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color={Colors.dark.secondaryText} 
        />
      </TouchableOpacity>
      
      {/* Horizontal scrolling list of episodes for this anime */}
      <FlatList
        data={animeItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.episodesList}
        keyExtractor={(item) => createUniqueKey(item)}
        renderItem={({ item }) => (
          <EpisodeItem 
            item={item}
            onRemove={onRemoveItem}
            onNavigate={onNavigateToStreaming}
          />
        )}
      />
    </View>
  );
});

/**
 * Header Component
 * 
 * Memoized header component with sync and clear functionality.
 * Provides cloud sync for authenticated users and clear all option.
 * Handles disabled states based on authentication and sync status.
 */
// Header Component
const Header = memo(({ onSync, onClear, isAuthenticated, isSyncing }: HeaderProps) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Watch History</Text>
    <View style={styles.headerButtons}>
      <TouchableOpacity 
        style={[styles.iconButton, (!isAuthenticated || isSyncing) && styles.disabledButton]} 
        onPress={onSync}
        disabled={!isAuthenticated || isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={Colors.dark.text} />
        ) : (
          <MaterialCommunityIcons name="cloud-sync-outline" size={20} color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} />
        )}
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.iconButton, styles.dangerButton]} 
        onPress={onClear}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.dark.text} />
      </TouchableOpacity>
    </View>
  </View>
));

/**
 * HistoryPage Component
 * 
 * Main watch history screen that displays user's viewing history grouped by anime.
 * Features:
 * - Groups episodes by anime series
 * - Shows watch progress for each episode
 * - Provides sync functionality for authenticated users
 * - Allows individual episode removal and bulk clear
 * - Navigation to continue watching or view anime details
 * - Hardware back button handling for Android
 */
export default function HistoryPage() {
  const router = useRouter();
  
  // Extract watch history functionality from context
  const { history, isLoading, isSyncing, removeFromHistory, clearHistory, syncHistory, isAuthenticated } = useWatchHistory();
  
  // Local state for organizing and displaying history data
  const [groupedHistory, setGroupedHistory] = useState<Record<string, WatchHistoryItem[]>>({});
  const [sortedAnimeIds, setSortedAnimeIds] = useState<string[]>([]);
  
  /**
   * Navigation handler for back button
   * Returns to the More tab when back is pressed
   */
  // Handle back button to return to the More tab
  const handleGoBack = () => {
    router.replace('/(tabs)/more');
  };

  /**
   * Hardware Back Button Effect
   * 
   * Handles Android hardware back button press to ensure proper navigation
   * Prevents default back behavior and uses custom navigation logic
   */
  //       Add hardware back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  /**
   * History Grouping and Sorting Effect
   * 
   * Processes watch history data to:
   * - Group episodes by anime ID
   * - Remove duplicate episodes (keeping most recent)
   * - Sort episodes within each anime by watch date
   * - Sort anime groups by most recent activity
   */
  // Group history by anime ID
  useEffect(() => {
    const grouped: Record<string, WatchHistoryItem[]> = history.reduce((acc: Record<string, WatchHistoryItem[]>, item) => {
      if (!acc[item.id]) {
        acc[item.id] = [];
      }
      
      // Check if we already have this episode in the array
      const existingIndex = acc[item.id].findIndex(
        existing => existing.episodeNumber === item.episodeNumber && existing.audioType === item.audioType
      );
      
      if (existingIndex >= 0) {
        // If we have this episode, use the one with the most recent watchedAt
        if (item.watchedAt > acc[item.id][existingIndex].watchedAt) {
          acc[item.id][existingIndex] = item;
        }
      } else {
        acc[item.id].push(item);
      }
      
      return acc;
    }, {});

    // Sort episodes within each anime by most recently watched
    Object.keys(grouped).forEach(animeId => {
      grouped[animeId].sort((a, b) => b.watchedAt - a.watchedAt);
    });
    
    // Sort animes by most recent activity
    const sortedIds = Object.keys(grouped).sort((a, b) => {
      const latestA = grouped[a][0]?.watchedAt || 0;
      const latestB = grouped[b][0]?.watchedAt || 0;
      return latestB - latestA;
    });

    setGroupedHistory(grouped);
    setSortedAnimeIds(sortedIds);
  }, [history]);

  /**
   * Episode Removal Handler
   * Shows confirmation dialog before removing episode from history
   */
  // Handle removal of history item
  const handleRemoveItem = useCallback((animeId: string, episodeNumber: string) => {
    showConfirmAlert(
      "Remove from History",
      "Are you sure you want to remove this episode from your watch history?",
      () => removeFromHistory(animeId, episodeNumber)
    );
  }, [removeFromHistory]);

  /**
   * Clear All History Handler
   * Shows confirmation dialog before clearing entire watch history
   */
  // Handle clear all history
  const handleClearHistory = useCallback(() => {
    showConfirmAlert(
      "Clear History",
      "Are you sure you want to clear your entire watch history?",
      clearHistory
    );
  }, [clearHistory]);

  /**
   * Navigation to Anime Details
   * Navigates to details page with proper source tracking
   */
  // Navigate to anime details
  const navigateToDetails = useCallback((animeId: string, animeName: string, thumbnailUrl: string) => {
    router.push({
      pathname: '/(tabs)/details',
      params: { 
        id: animeId, 
        title: animeName,
        thumbnail: thumbnailUrl,
        source: 'history'
      }
    });
  }, [router]);

  /**
   * Navigation to Streaming
   * Navigates to streaming screen to continue watching episode
   */
  // Navigate to streaming
  const navigateToStreaming = useCallback((item: WatchHistoryItem) => {
    router.push({
      pathname: "/streaming",
      params: { 
        id: item.id, 
        audioType: item.audioType,
        episode: item.episodeNumber,
        title: item.englishName,
        thumbnail: item.thumbnailUrl
      }
    });
  }, [router]);

  /**
   * Cloud Sync Handler
   * Handles syncing watch history with cloud storage
   * Shows authentication warning if user not logged in
   */
  // Handle sync history with cloud
  const handleSyncHistory = useCallback(() => {
    if (!isAuthenticated) {
      showErrorAlert(
        "Not Logged In", 
        "You need to be logged in to sync your watch history."
      );
      return;
    }
    
    syncHistory();
  }, [isAuthenticated, syncHistory]);

  /**
   * Loading State Render
   * Displays loading spinner while history data is being fetched
   */
  // Show full-screen loading only on initial load with no data
  if (isLoading && history.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading watch history...</Text>
      </View>
    );
  }

  /**
   * Empty State Render
   * Displays empty state when user has no watch history
   */
  // Show empty state
  if (history.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" />
        <Header 
          onSync={handleSyncHistory}
          onClear={handleClearHistory}
          isAuthenticated={isAuthenticated}
          isSyncing={isSyncing}
        />
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons 
            name="history" 
            size={60} 
            color={Colors.dark.secondaryText} 
          />
          <Text style={styles.emptyText}>Your watch history is empty</Text>
          <Text style={styles.emptySubtext}>
            Episodes you watch will appear here
          </Text>
        </View>
      </View>
    );
  }

  /**
   * Main History List Render
   * Displays grouped watch history with anime groups and episodes
   */
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      {/* Main history list grouped by anime */}
      <FlatList
        data={sortedAnimeIds}
        renderItem={({ item: animeId }) => (
          <AnimeGroup 
            animeId={animeId}
            animeItems={groupedHistory[animeId]}
            onNavigateToDetails={navigateToDetails}
            onNavigateToStreaming={navigateToStreaming}
            onRemoveItem={handleRemoveItem}
          />
        )}
        keyExtractor={(animeId) => `anime-${animeId}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Header 
            onSync={handleSyncHistory}
            onClear={handleClearHistory}
            isAuthenticated={isAuthenticated}
            isSyncing={isSyncing}
          />
        }
      />
    </View>
  );
}


