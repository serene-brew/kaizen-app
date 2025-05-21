import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Dimensions, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Colors from '../../constants/Colors';
import { useWatchHistory, WatchHistoryItem } from '../../contexts/WatchHistoryContext';
import { styles } from '../../styles/history.styles';

const { width } = Dimensions.get('window');

// Type definitions
interface EpisodeItemProps {
  item: WatchHistoryItem;
  onRemove: (animeId: string, episodeNumber: string) => void;
  onNavigate: (item: WatchHistoryItem) => void;
}

interface AnimeGroupProps {
  animeId: string;
  animeItems: WatchHistoryItem[];
  onNavigateToDetails: (animeId: string, animeName: string, thumbnailUrl: string) => void;
  onNavigateToStreaming: (item: WatchHistoryItem) => void;
  onRemoveItem: (animeId: string, episodeNumber: string) => void;
}

interface HeaderProps {
  onSync: () => void;
  onClear: () => void;
  isAuthenticated: boolean;
  isSyncing: boolean;
}

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

// Memoized Episode Item Component for better performance
const EpisodeItem = memo(({ item, onRemove, onNavigate }: EpisodeItemProps) => {
  return (
    <TouchableOpacity 
      style={styles.episodeItem} 
      onPress={() => onNavigate(item)}
    >
      <View style={styles.episodeHeader}>
        <View style={styles.episodeDetails}>
          <Text style={styles.episodeNumber}>
            Episode {item.episodeNumber}
          </Text>
          <View style={styles.audioBadge}>
            <Text style={styles.audioType}>
              {item.audioType.toUpperCase()}
            </Text>
          </View>
        </View>
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
      
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { width: `${Math.min(100, (item.position / (item.duration || 1)) * 100)}%` }
          ]} 
        />
      </View>
      
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

// Memoized Anime Group Component for better performance
const AnimeGroup = memo(({ animeId, animeItems, onNavigateToDetails, onNavigateToStreaming, onRemoveItem }: AnimeGroupProps) => {
  const firstItem = animeItems[0];
  
  return (
    <View style={styles.animeGroup}>
      <TouchableOpacity 
        style={styles.animeHeader}
        onPress={() => onNavigateToDetails(
          firstItem.id, 
          firstItem.englishName, 
          firstItem.thumbnailUrl
        )}
      >
        <Image 
          source={{ uri: firstItem.thumbnailUrl}} 
          style={styles.animeThumbnail} 
          defaultSource={require('../../assets/images/icon.png')}
        />
        <View style={styles.animeInfo}>
          <Text style={styles.animeName} numberOfLines={1}>
            {firstItem.englishName}
          </Text>
          <Text style={styles.episodeCount}>
            {animeItems.length} episode{animeItems.length > 1 ? 's' : ''} watched
          </Text>
          <Text style={styles.lastWatched}>
            Last watched: {formatDate(firstItem.watchedAt)}
          </Text>
        </View>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color={Colors.dark.secondaryText} 
        />
      </TouchableOpacity>
      
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

// Header Component
const Header = memo(({ onSync, onClear, isAuthenticated, isSyncing }: HeaderProps) => (
  <View style={styles.header}>
    <View style={styles.headerButtons}>
      <TouchableOpacity 
        style={[styles.headerButton, (!isAuthenticated || isSyncing) && styles.disabledButton]} 
        onPress={onSync}
        disabled={!isAuthenticated || isSyncing}
      >
        <MaterialCommunityIcons name="cloud-sync" size={18} color={isAuthenticated && !isSyncing ? Colors.dark.text : Colors.dark.secondaryText} />
        <Text style={styles.headerButtonText}>Sync</Text>
      </TouchableOpacity>
      <View style={styles.centerButtonSpacer} />
      <TouchableOpacity 
        style={[styles.headerButton, styles.clearButton]} 
        onPress={onClear}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.dark.text} />
        <Text style={styles.headerButtonText}>Clear All</Text>
      </TouchableOpacity>
    </View>
  </View>
));

export default function HistoryPage() {
  const router = useRouter();
  const { history, isLoading, isSyncing, removeFromHistory, clearHistory, syncHistory, isAuthenticated } = useWatchHistory();
  const [groupedHistory, setGroupedHistory] = useState<Record<string, WatchHistoryItem[]>>({});
  const [sortedAnimeIds, setSortedAnimeIds] = useState<string[]>([]);
  
  // Handle back button to return to the More tab
  const handleGoBack = () => {
    router.navigate('/(tabs)/more');
  };

  //       Add hardware back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

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

  // Handle removal of history item
  const handleRemoveItem = useCallback((animeId: string, episodeNumber: string) => {
    Alert.alert(
      "Remove from History",
      "Are you sure you want to remove this episode from your watch history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => removeFromHistory(animeId, episodeNumber)
        }
      ]
    );
  }, [removeFromHistory]);

  // Handle clear all history
  const handleClearHistory = useCallback(() => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your entire watch history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: clearHistory 
        }
      ]
    );
  }, [clearHistory]);

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

  // Handle sync history with cloud
  const handleSyncHistory = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Not Logged In", 
        "You need to be logged in to sync your watch history.",
        [{ text: "OK" }]
      );
      return;
    }
    
    syncHistory();
  }, [isAuthenticated, syncHistory]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading watch history...</Text>
      </View>
    );
  }
  
  // Show syncing indicator
  if (isSyncing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Refreshing watch history data...</Text>
      </View>
    );
  }

  // Show empty state
  if (history.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
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


