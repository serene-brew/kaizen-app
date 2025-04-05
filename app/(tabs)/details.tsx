import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Image } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { useLocalSearchParams } from 'expo-router';
import { useState } from "react";

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.4;

export default function DetailsPage() {
  const { id, title } = useLocalSearchParams();
  const [audioType, setAudioType] = useState<'sub' | 'dub'>('sub');
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const toggleWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    // TODO: Implement actual watchlist functionality
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.posterContainer}>
          <View style={styles.poster}>
            <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.summary}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.audioButton,
                audioType === 'sub' ? null : styles.buttonInactive
              ]}
              onPress={() => setAudioType('sub')}
            >
              <Text style={[
                styles.buttonText,
                audioType === 'sub' ? null : styles.buttonTextInactive
              ]}>SUB</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.audioButton,
                audioType === 'dub' ? null : styles.buttonInactive
              ]}
              onPress={() => setAudioType('dub')}
            >
              <Text style={[
                styles.buttonText,
                audioType === 'dub' ? null : styles.buttonTextInactive
              ]}>DUB</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.ratingSection}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.watchlistButton, isInWatchlist && styles.watchlistActive]} 
            onPress={toggleWatchlist}
          >
            <MaterialCommunityIcons 
              name={isInWatchlist ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={isInWatchlist ? Colors.dark.text : Colors.dark.secondaryText} 
            />
            <Text style={[styles.actionButtonText, isInWatchlist && styles.watchlistActiveText]}>
              {isInWatchlist ? 'Added' : 'Watchlist'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rightSection}>
          <View style={styles.rating}>
            <MaterialCommunityIcons name="star" size={24} color={Colors.dark.buttonBackground} />
            <Text style={styles.ratingText}>4.5</Text>
          </View>
          <TouchableOpacity style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>Reviews</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.episodesSection}>
        <Text style={styles.sectionTitle}>Episodes</Text>
        <View style={styles.episodeGrid}>
          {[...Array(100)].map((_, index) => (
            <TouchableOpacity 
              key={`episode-${index + 1}`}
              style={styles.episodeBox}
            >
              <Text style={styles.episodeNumber}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  posterContainer: {
    width: POSTER_WIDTH,
  },
  poster: {
    width: '100%',
    height: POSTER_WIDTH * 1.5,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  summary: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.dark.buttonBackground,
  },
  buttonInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  buttonText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  buttonTextInactive: {
    color: Colors.dark.secondaryText,
  },
  audioButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.border,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  watchlistButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchlistActive: {
    backgroundColor: Colors.dark.buttonBackground,
    borderColor: Colors.dark.buttonBackground,
  },
  actionButtonText: {
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  watchlistActiveText: {
    color: Colors.dark.text,
  },
  reviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  reviewButtonText: {
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  episodesSection: {
    padding: 16,
    paddingBottom: 70,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  episodeBox: {
    width: 48,
    height: 48,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeNumber: {
    color: Colors.dark.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
