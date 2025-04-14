import { View, Text, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { useState } from "react";
import { styles } from "../../styles/new.styles";

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;

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
