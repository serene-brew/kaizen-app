import { useState } from "react";
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { SearchBar } from "../../components";

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 60,
  },
  recentContainer: {
    flex: 1,
    paddingTop: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recentTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '500',
  },
  recentList: {
    paddingHorizontal: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  recentItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    marginRight: 12,
  },
  recentText: {
    color: Colors.dark.text,
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
});
