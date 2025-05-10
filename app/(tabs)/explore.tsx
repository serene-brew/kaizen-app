import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Colors from "../../constants/Colors";
import { styles } from "../../styles/explore.styles";
import { animeApi } from "../../lib/api";
import { AnimeItem } from "../../types/anime";

const { width } = Dimensions.get('window');
const AUTO_SWIPE_INTERVAL = 6000; // Changed from 3000ms to 6000ms (6 seconds)
const CAROUSEL_COUNT = 5;

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
  const [carouselAnime, setCarouselAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch anime data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setCarouselLoading(true);
      setError(null);
      
      try {
        console.log("Starting to fetch anime data for explore page...");
        
        // Fetch data from all endpoints in parallel
        const [topData, trendingData, carouselData] = await Promise.all([
          animeApi.fetchTopAnime(),
          animeApi.fetchTrendingAnime(),
          animeApi.fetchCarouselAnime(CAROUSEL_COUNT)
        ]);
        
        // Process top anime data
        if (!topData || topData.length === 0) {
          console.warn("Received empty top anime data from API");
        } else {
          console.log(`Received ${topData.length} top anime items from API`);
          const mappedTopData = topData.map(mapAnimeData);
          setTopAnime(mappedTopData.slice(0, 5)); // Only take the first 5 for the explore page
        }
        
        // Process trending anime data
        if (!trendingData || trendingData.length === 0) {
          console.warn("Received empty trending anime data from API");
        } else {
          console.log(`Received ${trendingData.length} trending anime items from API`);
          const mappedTrendingData = trendingData.map(mapAnimeData);
          setTrendingAnime(mappedTrendingData.slice(0, 5)); // Only take the first 5 for the explore page
        }
        
        // Process carousel anime data
        if (!carouselData || carouselData.length === 0) {
          console.warn("Received empty carousel anime data from API");
          setError("No featured anime data available");
        } else {
          console.log(`Received ${carouselData.length} carousel anime items from API`);
          const mappedCarouselData = carouselData.map(mapAnimeData);
          setCarouselAnime(mappedCarouselData);
        }
        
        console.log("Successfully set anime data for explore page");
      } catch (err) {
        console.error("Error fetching anime data:", err);
        setError("Failed to load anime data");
      } finally {
        setLoading(false);
        setCarouselLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-swipe carousel
  useEffect(() => {
    if (carouselAnime.length === 0) return;

    const timer = setInterval(() => {
      if (activeIndex === carouselAnime.length - 1) {
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
  }, [activeIndex, carouselAnime.length]);

  const handlePressCard = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id: item.id, title: item.englishName, source: 'explore' }
    });
  };

  const handlePressCarousel = (item: AnimeItem) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id: item.id, title: item.englishName, source: 'explore' }
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

  // Render a carousel item with proper styling and image
  const renderCarouselItem = (item: AnimeItem, index: number) => (
    <TouchableOpacity 
      key={`carousel-${item.id}`} 
      style={styles.carouselItem}
      onPress={() => handlePressCarousel(item)}
    >
      {item.thumbnail ? (
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.carouselImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.carouselItem}>
          <MaterialCommunityIcons name="image-off" size={40} color={Colors.dark.secondaryText} />
          <Text style={styles.placeholderText}>No image available</Text>
        </View>
      )}
      
      {/* Use LinearGradient for overlay with text */}
      <LinearGradient
        colors={['transparent', 'rgba(22, 22, 34, 0.7)', 'rgba(22, 22, 34, 0.9)']}
        style={styles.carouselGradient}
      />
      
      <View style={styles.carouselContent}>
        <Text style={styles.carouselTitle} numberOfLines={2}>
          {item.englishName}
        </Text>
        
        <View style={styles.carouselInfo}>
          {item.genres && item.genres.length > 0 && (
            <>
              <Text style={styles.carouselGenre}>
                {item.genres[0]}
              </Text>
              <View style={styles.carouselDot} />
            </>
          )}
          
          {item.format && (
            <>
              <Text style={styles.carouselGenre}>
                {item.format}
              </Text>
              <View style={styles.carouselDot} />
            </>
          )}
          
          <View style={styles.carouselRating}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.carouselRatingText}>
              {typeof item.score === 'number' && item.score > 0 
                ? item.score.toFixed(1) 
                : 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.carouselActions}>
          <TouchableOpacity 
            style={styles.bookmarkButton}
            onPress={(e) => toggleWatchlist(item.id, e)}
          >
            <MaterialCommunityIcons 
              name={watchlist.includes(item.id) ? "bookmark" : "bookmark-outline"}
              size={24} 
              color={watchlist.includes(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Pagination dots */}
      <View style={styles.paginationDots}>
        {carouselAnime.map((_, dotIndex) => (
          <View
            key={dotIndex}
            style={[
              styles.dot,
              dotIndex === activeIndex && styles.activeDot
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" translucent />
      {/* Carousel Section */}
      <View style={styles.carouselContainer}>
        {carouselLoading ? (
          <View style={styles.carouselLoadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
            <Text style={[styles.placeholderText, { marginTop: 10 }]}>Loading featured anime...</Text>
          </View>
        ) : carouselAnime.length > 0 ? (
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
            {carouselAnime.map((item, index) => renderCarouselItem(item, index))}
          </ScrollView>
        ) : (
          <View style={styles.carouselLoadingContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors.dark.buttonBackground} />
            <Text style={[styles.placeholderText, { marginTop: 10 }]}>No featured anime available</Text>
          </View>
        )}
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
