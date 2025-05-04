import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Image } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { styles } from "../../styles/explore.styles";
import { animeApi, AnimeItem } from "../../lib/api";

const { width } = Dimensions.get('window');
const CAROUSEL_DATA = [1, 2, 3, 4, 5];
const AUTO_SWIPE_INTERVAL = 3000;

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

export default function Explore() {
  const carouselRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [topAnime, setTopAnime] = useState<AnimeItem[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch anime data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Starting to fetch anime data for explore page...");
        
        // Fetch data from both endpoints in parallel
        const [topData, trendingData] = await Promise.all([
          animeApi.fetchTopAnime(),
          animeApi.fetchTrendingAnime()
        ]);
        
        // Process top anime data
        if (!topData || topData.length === 0) {
          console.warn("Received empty top anime data from API");
          setError("No top anime data available");
        } else {
          console.log(`Received ${topData.length} top anime items from API`);
          const mappedTopData = topData.map(mapAnimeData);
          setTopAnime(mappedTopData.slice(0, 5)); // Only take the first 5 for the explore page
        }
        
        // Process trending anime data
        if (!trendingData || trendingData.length === 0) {
          console.warn("Received empty trending anime data from API");
          if (!topData || topData.length === 0) {
            setError("No anime data available");
          }
        } else {
          console.log(`Received ${trendingData.length} trending anime items from API`);
          const mappedTrendingData = trendingData.map(mapAnimeData);
          setTrendingAnime(mappedTrendingData.slice(0, 5)); // Only take the first 5 for the explore page
        }
        
        console.log("Successfully set top and trending anime data");
      } catch (err) {
        console.error("Error fetching anime data:", err);
        setError("Failed to load anime data");
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

  const handlePressCarousel = (id: number) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title: `Featured Anime ${id}` }
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

  const renderCard = (item: AnimeItem, type: 'trending' | 'top', index: number, array: AnimeItem[]) => (
    <TouchableOpacity 
      key={`${type}-${item.id}`} 
      style={[
        styles.card,
        index === array.length - 1 ? styles.lastCard : null // Apply lastCard style to the last item
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
        {item.englishName}
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (activeIndex === CAROUSEL_DATA.length - 1) {
        setActiveIndex(0);
        carouselRef.current?.scrollTo({ x: 0, animated: true });
      } else {
        setActiveIndex(activeIndex + 1);
        carouselRef.current?.scrollTo({
          x: width * (activeIndex + 1),
          animated: true,
        });
      }
    }, AUTO_SWIPE_INTERVAL);

    return () => clearInterval(timer);
  }, [activeIndex]);

  // Show a loading placeholder when data is loading
  const renderLoadingCard = (index: number, type: 'trending' | 'top', isLast: boolean = false) => (
    <View 
      key={`${type}-loading-${index}`} 
      style={[styles.card, isLast ? styles.lastCard : null]}
    >
      <View style={styles.posterPlaceholder}>
        <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
      </View>
      <View style={styles.loadingTitle} />
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Carousel Section */}
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveIndex(newIndex);
          }}
        >
          {CAROUSEL_DATA.map((item) => (
            <TouchableOpacity 
              key={`carousel-${item}`} 
              style={styles.carouselItem}
              onPress={() => handlePressCarousel(item)}
            >
              <Text style={styles.placeholderText}>Carousel Item {item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.paginationDots}>
          {CAROUSEL_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      </View>

      {/* Trending Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending</Text>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => router.push("/(tabs)/new")}
          >
            <Text style={styles.moreButtonText}>More</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={Colors.dark.buttonBackground} 
            />
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {loading ? 
            Array(5).fill(0).map((_, index) => renderLoadingCard(index, 'trending', index === 4)) :
            trendingAnime.length > 0 ? 
              trendingAnime.map((item, index, array) => renderCard(item, 'trending', index, array)) :
              error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>No trending anime available</Text>
                </View>
              )
          }
        </ScrollView>
      </View>

      {/* Top Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top</Text>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => router.push("/(tabs)/trending")}
          >
            <Text style={styles.moreButtonText}>More</Text>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={Colors.dark.buttonBackground}
            />
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {loading ? 
            Array(5).fill(0).map((_, index) => renderLoadingCard(index, 'top', index === 4)) :
            topAnime.length > 0 ? 
              topAnime.map((item, index, array) => renderCard(item, 'top', index, array)) :
              error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>No top anime available</Text>
                </View>
              )
          }
        </ScrollView>
      </View>
    </ScrollView>
  );
}
