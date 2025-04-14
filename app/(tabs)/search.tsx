import { useState } from "react";
import { View, SafeAreaView, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { SearchBar } from "../../components";
import { styles } from "../../styles/search.styles";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Attack on Titan",
    "One Piece",
    "Demon Slayer",
    "Jujutsu Kaisen"
  ]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Add to recent searches if not already present
      if (!recentSearches.includes(searchQuery.trim())) {
        setRecentSearches(prev => [searchQuery.trim(), ...prev]);
      }
      console.log('Searching for:', searchQuery);
    }
  };

  const removeSearch = (index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllSearches = () => {
    setRecentSearches([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearch}
        />
      </View>

      {recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
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
    </SafeAreaView>
  );
}
