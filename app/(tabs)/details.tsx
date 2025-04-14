import { View, Text, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { useLocalSearchParams } from 'expo-router';
import { useState } from "react";
import { styles } from "../../styles/details.styles";

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
