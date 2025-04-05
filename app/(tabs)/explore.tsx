import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.4;
const CAROUSEL_HEIGHT = width * 0.6;
const CAROUSEL_DATA = [1, 2, 3, 4, 5]; // Example carousel items
const AUTO_SWIPE_INTERVAL = 3000; // 3 seconds between swipes

export default function Explore() {
  const carouselRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
          {[1, 2, 3, 4, 5].map((item) => (
            <TouchableOpacity 
              key={`new-${item}`} 
              style={styles.card}
              onPress={() => handlePressCard(item, `Anime Title ${item}`)}
            >
              <View style={styles.posterPlaceholder}>
                <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                Anime Title {item}
              </Text>
            </TouchableOpacity>
          ))}
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
          {[1, 2, 3, 4, 5].map((item) => (
            <TouchableOpacity 
              key={`trending-${item}`} 
              style={styles.card}
              onPress={() => handlePressCard(item, `Anime Title ${item}`)}
            >
              <View style={styles.posterPlaceholder}>
                <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                Anime Title {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingBottom: 100, // Added padding for tabs, else it might glitch and overlap
  },
  carouselContainer: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    marginBottom: 20,
  },
  carouselItem: {
    width: width,
    height: CAROUSEL_HEIGHT,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.secondaryText,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Colors.dark.buttonBackground,
  },
  placeholderText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  moreButtonText: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollContainer: {
    paddingLeft: 16,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  posterPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
