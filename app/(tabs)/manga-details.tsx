import { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import Colors from '../../constants/Colors';
import { styles } from '../../styles/details.styles';
import { mangaApi } from '../../lib/api';
import { MangaDetails } from '../../types/manga';
import { useReadlist } from '../../contexts/ReadlistContext';
import { useReadHistory } from '../../contexts/ReadHistoryContext';

export default function MangaDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string; source?: string; type?: string; query?: string; genres?: string }>();
  const mangaId = typeof params.id === 'string' ? params.id : undefined;
  const initialTitle = typeof params.title === 'string' ? params.title : 'Manga';
  const source = typeof params.source === 'string' ? params.source : undefined;
  const searchTypeParam = typeof params.type === 'string' ? params.type : undefined;
  const searchQueryParam = typeof params.query === 'string' ? params.query : undefined;
  const searchGenresParam = typeof params.genres === 'string' ? params.genres : undefined;

  const [details, setDetails] = useState<MangaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [selectedRange, setSelectedRange] = useState(0); // Currently selected chapter range index
  const [sortDescending, setSortDescending] = useState(false); // Sort order for chapters (default: ascending)

  const { isInReadlist, toggleReadlist } = useReadlist();
  const { getChaptersForManga, getLastReadChapter, refreshHistory, isAuthenticated } = useReadHistory();

  useEffect(() => {
    const loadDetails = async () => {
      if (!mangaId) {
        setError('Missing manga identifier.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await mangaApi.fetchMangaDetails(mangaId);
        if (!response) {
          setError('Unable to find details for this manga.');
          return;
        }
        setDetails(response);
      } catch (err) {
        console.error('Error fetching manga details:', err);
        setError('Failed to load manga details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [mangaId]);

  const displayTitle = details?.englishName || details?.title || initialTitle;

  // Reverse chapters array from API (comes in descending) to make ascending the default
  const translatedChapters = useMemo(() => {
    const chapters = details?.chapters?.sub ?? [];
    return [...chapters].reverse();
  }, [details?.chapters?.sub]);
  const readChapters = useMemo(() => (mangaId ? getChaptersForManga(mangaId) : []), [mangaId, getChaptersForManga]);
  const readChapterSet = useMemo(() => new Set(readChapters.map((c) => String(c.chapter))), [readChapters]);
  const lastRead = useMemo(() => (mangaId ? getLastReadChapter(mangaId) : null), [mangaId, getLastReadChapter]);

  // Pagination logic for chapters
  const CHAPTERS_PER_PAGE = 50;
  
  // Create chapter ranges using actual chapter numbers
  const chapterRanges = useMemo(() => {
    const ranges: { start: number; end: number; label: string }[] = [];
    const total = translatedChapters.length;
    
    for (let i = 0; i < total; i += CHAPTERS_PER_PAGE) {
      const start = i + 1;
      const end = Math.min(i + CHAPTERS_PER_PAGE, total);
      const firstChapter = translatedChapters[i];
      const lastChapter = translatedChapters[Math.min(i + CHAPTERS_PER_PAGE - 1, total - 1)];
      ranges.push({
        start,
        end,
        label: `${firstChapter}-${lastChapter}`
      });
    }
    
    return ranges;
  }, [translatedChapters]);

  // Get paginated chapters for current range
  const paginatedChapters = useMemo(() => {
    if (chapterRanges.length === 0) return [];
    
    const range = chapterRanges[selectedRange];
    if (!range) return [];
    
    const start = range.start - 1;
    const end = range.end;
    let chapters = translatedChapters.slice(start, end);
    
    // Apply sort order
    if (sortDescending) {
      chapters = [...chapters].reverse();
    }
    
    return chapters;
  }, [translatedChapters, selectedRange, chapterRanges, sortDescending]);

  const handleGoBack = useCallback(() => {
    if (source === 'search') {
      router.replace({
        pathname: '/searchResults',
        params: {
          type: searchTypeParam || 'manga',
          ...(searchQueryParam ? { query: searchQueryParam } : {}),
          ...(searchGenresParam ? { genres: searchGenresParam } : {}),
        },
      });
    } else if (source === 'read-history') {
      router.replace('/(tabs)/read-history');
    } else {
      router.back();
    }
  }, [router, source, searchTypeParam, searchQueryParam, searchGenresParam]);

  // Ensure Android hardware back returns to the correct screen when coming from search
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        void refreshHistory();
      }

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true;
      });

      return () => subscription.remove();
    }, [handleGoBack, isAuthenticated, refreshHistory])
  );

  const handleToggleReadlist = useCallback(() => {
    if (!mangaId) {
      return;
    }

    toggleReadlist({ id: mangaId, title: displayTitle, thumbnail: details?.thumbnail });
  }, [mangaId, toggleReadlist, displayTitle, details]);

  const handleChapterPress = useCallback((chapter: string) => {
    if (!mangaId) {
      return;
    }

    router.push({
      pathname: '/manga-reader',
      params: {
        mangaId,
        chapter,
        title: displayTitle,
        thumbnail: details?.thumbnail,
        // Preserve navigation context so reader can return to details cleanly
        returnTo: 'manga-details',
        source: source || 'search',
        type: searchTypeParam || 'manga',
        ...(searchQueryParam ? { query: searchQueryParam } : {}),
        ...(searchGenresParam ? { genres: searchGenresParam } : {}),
      }
    });
  }, [mangaId, router, displayTitle, source, searchTypeParam, searchQueryParam, searchGenresParam, details]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" translucent />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 16 }}>Loading manga details...</Text>
      </View>
    );
  }

  if (error || !details) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" translucent />
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 16 }}>{error || 'Could not load manga details'}</Text>
        <TouchableOpacity
          style={{ marginTop: 20, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.dark.buttonBackground }}
          onPress={handleGoBack}
        >
          <Text style={{ color: Colors.dark.text, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inReadlist = mangaId ? isInReadlist(mangaId) : false;
  const hasLongDescription = (details.description?.length || 0) > 220;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" translucent />

      <View style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.posterContainer}>
          <Image
            source={{ uri: details.thumbnail || 'https://via.placeholder.com/300x450?text=No+Image' }}
            style={styles.poster}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.watchlistButton} onPress={handleToggleReadlist}>
            <MaterialCommunityIcons
              name={inReadlist ? 'book' : 'book-outline'}
              size={24}
              color={inReadlist ? Colors.dark.buttonBackground : Colors.dark.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>

          {typeof details.score === 'number' && details.score > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{details.score.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.badges}>
            {details.status && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{details.status}</Text>
              </View>
            )}
            {details.countryOfOrigin && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{details.countryOfOrigin}</Text>
              </View>
            )}
            {typeof details.subCount === 'number' && details.subCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Chapters: {details.subCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.sectionTitle}>Synopsis</Text>
        <Text
          style={styles.description}
          numberOfLines={!expandedDescription && hasLongDescription ? 4 : undefined}
        >
          <Text style={styles.fullTitle}>{displayTitle}</Text>
          {details.description ? `\n\n${details.description}` : '\n\nNo description available.'}
        </Text>
        {hasLongDescription && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpandedDescription((prev) => !prev)}
          >
            <Text style={styles.expandButtonText}>
              {expandedDescription ? 'Show Less' : 'Read More'}
            </Text>
            <MaterialCommunityIcons
              name={expandedDescription ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.dark.buttonBackground}
            />
          </TouchableOpacity>
        )}
      </View>

      {details.genres && details.genres.length > 0 && (
        <View style={styles.genresContainer}>
          <Text style={styles.sectionTitle}>Genres</Text>
          <View style={styles.genresList}>
            {details.genres.slice(0, 15).map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreChipText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {translatedChapters.length > 0 && (
        <View style={styles.episodesSection}>
          <View style={styles.episodesHeader}>
            <Text style={styles.sectionTitle}>Chapters ({translatedChapters.length})</Text>
            {/* Sort order toggle button */}
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortDescending(!sortDescending)}
            >
              <MaterialCommunityIcons 
                name={sortDescending ? "sort-descending" : "sort-ascending"} 
                size={20} 
                color={Colors.dark.buttonBackground} 
              />
              <Text style={styles.sortButtonText}>
                {sortDescending ? "Desc" : "Asc"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chapter range selector - only show if more than 50 chapters */}
          {chapterRanges.length > 1 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.rangeSelector}
              contentContainerStyle={styles.rangeSelectorContent}
            >
              {chapterRanges.map((range, index) => (
                <TouchableOpacity
                  key={`range-${index}`}
                  style={[
                    styles.rangeCard,
                    selectedRange === index && styles.rangeCardActive
                  ]}
                  onPress={() => setSelectedRange(index)}
                >
                  <Text style={[
                    styles.rangeCardText,
                    selectedRange === index && styles.rangeCardTextActive
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.episodeGrid}>
            {paginatedChapters.map((chapter) => {
              const chapterKey = String(chapter);
              const isCurrent = lastRead?.chapter === chapterKey;
              const isWatched = readChapterSet.has(chapterKey);
              return (
                <TouchableOpacity
                  key={`sub-${chapter}`}
                  style={[
                    styles.episodeBox,
                    isCurrent && styles.currentEpisodeBox,
                    !isCurrent && isWatched && styles.watchedEpisodeBox,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleChapterPress(chapter)}
                >
                  <Text style={[styles.episodeNumber, (isCurrent || isWatched) && styles.watchedEpisodeText]}>{chapter}</Text>
                  {(isCurrent || isWatched) && (
                    <View style={styles.watchedIndicator}>
                      <MaterialCommunityIcons name={isCurrent ? 'play-circle-outline' : 'check'} size={12} color={Colors.dark.text} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {translatedChapters.length === 0 && (
        <View style={styles.episodesSection}>
          <Text style={{ color: Colors.dark.secondaryText }}>
            No translated chapters available yet.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
