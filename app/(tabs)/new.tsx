import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router"; // Add this import
import Colors from "../../constants/Colors";
import { useState } from "react";

const { width } = Dimensions.get('window');
// Adjusted calculations for better spacing
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export default function NewPage() {
  const [watchlist, setWatchlist] = useState<number[]>([]);

  const handlePressCard = (id: number, title: string) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title: `Anime Title ${id}` }
    });
  };

  const toggleWatchlist = (id: number, event: any) => {
    event.stopPropagation();
    setWatchlist(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item, index) => (
          <TouchableOpacity 
            key={`new-${item}`} 
            style={[
              styles.card,
              // Add margin to odd numbered items
              index % 2 === 0 ? { marginRight: GAP } : null
            ]}
            onPress={() => handlePressCard(item, `Anime Title ${item}`)}
          >
            <View style={styles.posterPlaceholder}>
              <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
              <TouchableOpacity 
                style={styles.watchlistIcon}
                onPress={(e) => toggleWatchlist(item, e)}
              >
                <MaterialCommunityIcons 
                  name={watchlist.includes(item) ? "bookmark" : "bookmark-outline"}
                  size={24} 
                  color={watchlist.includes(item) ? Colors.dark.buttonBackground : Colors.dark.text}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              Anime Title {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: PADDING,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: GAP,
  },
  posterPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  watchlistIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
});
