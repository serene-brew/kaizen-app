import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { styles } from "../../styles/watchlist.styles";

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export default function Watchlist() {
  const [watchlistItems] = useState<number[]>([1, 2, 3, 4]); // Dummy data
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  const handlePressCard = (id: number) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title: `Anime Title ${id}` }
    });
  };

  const toggleSort = () => {
    setSortBy(prev => prev === 'recent' ? 'name' : 'recent');
  };

  if (watchlistItems.length === 0) {
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
        <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
          <MaterialCommunityIcons 
            name={sortBy === 'recent' ? "sort-clock-descending" : "sort-alphabetical-ascending"} 
            size={24} 
            color={Colors.dark.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {watchlistItems.map((item, index) => (
            <TouchableOpacity 
              key={`watchlist-${item}`}
              style={[
                styles.card,
                index % 2 === 0 ? { marginRight: GAP } : null
              ]}
              onPress={() => handlePressCard(item)}
            >
              <View style={styles.posterPlaceholder}>
                <MaterialCommunityIcons 
                  name="image" 
                  size={40} 
                  color={Colors.dark.secondaryText}
                />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => {/* TODO: Implement remove from watchlist */}}
                >
                  <MaterialCommunityIcons 
                    name="bookmark-remove" 
                    size={24} 
                    color={Colors.dark.buttonBackground}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                Anime Title {item}
              </Text>
              <Text style={styles.cardSubtitle}>
                Added {index + 1}d ago
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
