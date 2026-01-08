import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import Colors from '../../constants/Colors';
import { styles } from '../../styles/manga.styles';
import { mangaApi } from '../../lib/api';
import { MangaItem } from '../../types/manga';
import { useReadlist } from '../../contexts/ReadlistContext';

interface DisplayMangaItem {
  id: string;
  thumbnail: string;
  displayName: string;
}

const mapMangaItem = (item: MangaItem): DisplayMangaItem => {
  const englishName = item.englishName?.trim();
  const title = item.title?.trim();
  const displayName = englishName || title || 'Unknown Manga';

  return {
    id: item.id?.toString() || String(Math.random()),
    thumbnail: item.thumbnail || '',
    displayName,
  };
};

export default function MangaPage() {
  const [manga, setManga] = useState<DisplayMangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isInReadlist, toggleReadlist } = useReadlist();

  const fetchManga = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mangaApi.fetchPopularManga();
      if (!response || response.length === 0) {
        setError('No manga data available');
        setManga([]);
        return;
      }

      const mapped = response.map(mapMangaItem);
      setManga(mapped);
    } catch (err) {
      console.error('Error fetching manga list:', err);
      setError('Failed to load manga. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManga();
  }, []);

  const handleOpenDetails = (item: DisplayMangaItem) => {
    router.push({
      pathname: '/(tabs)/manga-details',
      params: { id: item.id, title: item.displayName, source: 'manga-list' }
    });
  };

  const renderCard = (item: DisplayMangaItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => handleOpenDetails(item)}
    >
      <View style={styles.cover}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
        )}
        <TouchableOpacity
          style={styles.readlistIcon}
          onPress={(e) => {
            e.stopPropagation();
            toggleReadlist({ id: item.id, title: item.displayName, thumbnail: item.thumbnail });
          }}
        >
          <MaterialCommunityIcons
            name={isInReadlist(item.id) ? 'book' : 'book-outline'}
            size={22}
            color={isInReadlist(item.id) ? Colors.dark.buttonBackground : Colors.dark.text}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.displayName}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading manga...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.dark.buttonBackground} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchManga} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.dark.buttonBackground }}>
          <Text style={{ color: Colors.dark.text, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {manga.map(renderCard)}
        </View>
      </ScrollView>
    </View>
  );
}
