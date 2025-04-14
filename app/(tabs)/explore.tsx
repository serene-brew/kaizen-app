import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { styles } from "../../styles/explore.styles";

const { width } = Dimensions.get('window');
const CAROUSEL_DATA = [1, 2, 3, 4, 5];
const AUTO_SWIPE_INTERVAL = 3000;

export default function Explore() {
  const carouselRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [watchlist, setWatchlist] = useState<number[]>([]);

  const handlePressCard = (id: number, title: string) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title: `Anime Title ${id}` }
    });
  };

  const handlePressCarousel = (id: number) => {
    router.push({
      pathname: "/(tabs)/details",
      params: { id, title: `Featured Anime ${id}` }
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

  const renderCard = (item: number, type: 'new' | 'trending') => (
    <TouchableOpacity 
      key={`${type}-${item}`} 
      style={styles.card}
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

      {/* New Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New</Text>
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
        >
          {[1, 2, 3, 4, 5].map((item) => renderCard(item, 'new'))}
        </ScrollView>
      </View>

      {/* Trending Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending</Text>
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
        >
          {[1, 2, 3, 4, 5].map((item) => renderCard(item, 'trending'))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}
