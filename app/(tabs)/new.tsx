import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { styles } from "../../styles/new.styles";
import { animeApi, AnimeItem } from "../../lib/api";

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;

// Helper function to map API response to our AnimeItem structure
const mapAnimeData = (item: any): AnimeItem => {
  return {
    id: item.id?.toString() || item._id?.toString() || String(Math.random()),
    englishName: item.englishName || item.title || item.name || "Unknown Anime",
    thumbnail: item.thumbnail || item.image || item.coverImage || "",
    score: item.score || item.rating || 0,
    genres: item.genres || [],
    format: item.format || "",
    status: item.status || "",
    episodes: item.episodes || 0,
    duration: item.duration || 0,
    startDate: item.startDate || { year: 0, month: 0, day: 0 }
  };
};

export default function TrendingPage() {
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Starting to fetch trending anime data...");
        // Using the dedicated trending anime endpoint
        const rawData = await animeApi.fetchTrendingAnime();
        
        if (!rawData || rawData.length === 0) {
          console.warn("Received empty data from API");
          setError("No anime data available");
          return;
        }
        
        // Map the data to ensure we have all required properties
        const mappedData = rawData.map(mapAnimeData);
        console.log(`Successfully mapped ${mappedData.length} trending anime items`);
        
        setTrendingAnime(mappedData);
      } catch (err) {
        console.error("Error fetching trending anime:", err);
        setError("Failed to load trending anime data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePressCard = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id: item.id, title: item.englishName }
    });
  };

  const toggleWatchlist = (id: string, event: any) => {
    event.stopPropagation();
    setWatchlist(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading trending anime...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.dark.buttonBackground} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            animeApi.fetchTrendingAnime()
              .then(data => {
                if (data && data.length > 0) {
                  setTrendingAnime(data.map(mapAnimeData));
                  setError(null);
                } else {
                  setError("No anime data available");
                }
              })
              .catch(err => {
                console.error("Error retrying fetch:", err);
                setError("Failed to load trending anime data");
              })
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (trendingAnime.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No trending anime available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {trendingAnime.map((item, index) => (
          <TouchableOpacity 
            key={`trending-${item.id}`} 
            style={[
              styles.card,
              index % 2 === 0 ? { marginRight: GAP } : null
            ]}
            onPress={() => handlePressCard(item)}
          >
            <View style={styles.posterPlaceholder}>
              {item.thumbnail ? (
                <Image 
                  source={{ uri: item.thumbnail }} 
                  style={styles.posterImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
              )}
              <TouchableOpacity 
                style={styles.watchlistIcon}
                onPress={(e) => toggleWatchlist(item.id, e)}
              >
                <MaterialCommunityIcons 
                  name={watchlist.includes(item.id) ? "bookmark" : "bookmark-outline"}
                  size={24} 
                  color={watchlist.includes(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.englishName || "Unknown Anime"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
