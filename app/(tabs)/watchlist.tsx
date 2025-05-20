import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { styles } from "../../styles/watchlist.styles";
import { useWatchlist } from "../../contexts/WatchlistContext";
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export default function Watchlist() {
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  
  // Use the watchlist context with new syncing capabilities
  const { watchlist, removeFromWatchlist, sortWatchlist, isLoading, isSyncing, syncWatchlist, isAuthenticated } = useWatchlist();

  const handlePressCard = (id: string, title: string) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title, source: "watchlist" }
    });
  };

  const handleRemoveFromWatchlist = async (id: string, event: any) => {
    event.stopPropagation();
    await removeFromWatchlist(id);
  };

  const toggleSort = () => {
    const newSortBy = sortBy === 'recent' ? 'name' : 'recent';
    setSortBy(newSortBy);
    sortWatchlist(newSortBy);
  };
  
  // Show loading indicator while fetching watchlist data
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading watchlist...</Text>
      </View>
    );
  }

  // Show syncing indicator
  if (isSyncing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Syncing watchlist to cloud...</Text>
      </View>
    );
  }

  // If watchlist is empty, show the empty state
  if (watchlist.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name="bookmark-off-outline" 
          size={64} 
          color={Colors.dark.secondaryText} 
        />
        <Text style={styles.emptyText}>Your watchlist is empty</Text>
        <TouchableOpacity 
          style={styles.exploreButton}
          onPress={() => router.push("/(tabs)/explore")}
        >
          <Text style={styles.exploreButtonText}>Explore Anime</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Watchlist</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.iconButton, !isAuthenticated && styles.disabledButton]} 
            onPress={syncWatchlist}
            disabled={!isAuthenticated || isSyncing}
          >
            <MaterialCommunityIcons 
              name="cloud-sync" 
              size={24} 
              color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={toggleSort}>
            <MaterialCommunityIcons 
              name={sortBy === 'recent' ? "sort-clock-descending" : "sort-alphabetical-ascending"} 
              size={24} 
              color={Colors.dark.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.grid}>
          {watchlist.map((item, index) => (
            <TouchableOpacity 
              key={`watchlist-${item.id}`}
              style={[
                styles.card,
                index % 2 === 0 ? { marginRight: GAP } : null
              ]}
              onPress={() => handlePressCard(item.id, item.englishName)}
            >
              <View style={styles.posterPlaceholder}>
                {item.thumbnailUrl ? (
                  <Image 
                    source={{ uri: item.thumbnailUrl }} 
                    style={{
                      width: '100%', 
                      height: '100%', 
                      borderRadius: 8,
                    }} 
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="image" 
                    size={40} 
                    color={Colors.dark.secondaryText}
                  />
                )}
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
                {!item.documentId && isAuthenticated && (
                  <View style={styles.notSyncedIndicator}>
                    <MaterialCommunityIcons 
                      name="cloud-off-outline" 
                      size={16} 
                      color={Colors.dark.buttonBackground}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.englishName}
              </Text>
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
