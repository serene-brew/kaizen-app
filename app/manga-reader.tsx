import { useEffect, useState, memo, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView, Image as RNImage, FlatList, ViewToken, ListRenderItem, BackHandler } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView, PinchGestureHandler, PinchGestureHandlerGestureEvent, TapGestureHandler, TapGestureHandlerGestureEvent, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

import Colors from '../constants/Colors';
import { styles } from '../styles/manga-reader.styles';
import { mangaApi } from '../lib/api';
import { MangaChapter } from '../types/manga';
import { useReadHistory } from '../contexts/ReadHistoryContext';
import { smartCacheCleanup } from '../lib/imageCacheService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PageData {
  url: string;
  index: number;
}

export default function MangaReaderPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mangaId?: string; chapter?: string; title?: string; returnTo?: string; source?: string; type?: string; query?: string; genres?: string; thumbnail?: string }>();
  
  const mangaId = typeof params.mangaId === 'string' ? params.mangaId : undefined;
  const chapter = typeof params.chapter === 'string' ? params.chapter : undefined;
  const mangaTitle = typeof params.title === 'string' ? params.title : 'Manga';
  const thumbnailParam = typeof params.thumbnail === 'string' ? params.thumbnail : undefined;
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const source = typeof params.source === 'string' ? params.source : undefined;
  const searchTypeParam = typeof params.type === 'string' ? params.type : undefined;
  const searchQueryParam = typeof params.query === 'string' ? params.query : undefined;
  const searchGenresParam = typeof params.genres === 'string' ? params.genres : undefined;

  const [chapterData, setChapterData] = useState<MangaChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ [key: number]: { width: number; height: number } }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [pageData, setPageData] = useState<PageData[]>([]);
  const [isZoomed, setIsZoomed] = useState(false);
  const aspectRatiosRef = useRef<{ [key: number]: number }>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentPageRef = useRef<number | null>(null);

  const { addToHistory } = useReadHistory();

  useEffect(() => {
    const loadChapter = async () => {
      if (!mangaId || !chapter) {
        setError('Missing manga ID or chapter number.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Perform smart cache cleanup to prevent storage bloat
        // This runs in background and doesn't block chapter loading
        smartCacheCleanup().catch((err: any) => 
          console.warn('[MangaReader] Cache cleanup warning:', err)
        );

        const data = await mangaApi.fetchMangaChapter(mangaId, chapter);
        if (!data || !data.pages || data.pages.length === 0) {
          setError('No pages found for this chapter.');
          return;
        }
        
        setChapterData(data);
        setPageData(data.pages.map((url, index) => ({ url, index })));
        lastSentPageRef.current = null;
      } catch (err) {
        console.error('Error fetching manga chapter:', err);
        setError('Failed to load chapter. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [mangaId, chapter]);

  useEffect(() => {
    if (chapterData?.pages) {
      const dimensionUpdates: { [key: number]: { width: number; height: number } } = {};
      let loadedCount = 0;
      const totalPages = chapterData.pages.length;

      // Batch dimension updates to prevent constant re-renders
      chapterData.pages.forEach((pageUrl, index) => {
        RNImage.getSize(
          pageUrl,
          (width: number, height: number) => {
            dimensionUpdates[index] = { width, height };
            loadedCount++;

            // Update in batches of 5 or when all are loaded
            if (loadedCount % 5 === 0 || loadedCount === totalPages) {
              setImageDimensions(prev => ({ ...prev, ...dimensionUpdates }));
              // Store aspect ratios in ref
              Object.keys(dimensionUpdates).forEach(key => {
                const idx = parseInt(key);
                const dims = dimensionUpdates[idx];
                aspectRatiosRef.current[idx] = dims.width / dims.height;
              });
            }
          },
          (error: any) => {
            console.error(`Failed to get size for image ${index}:`, error);
            loadedCount++;
          }
        );
      });
    }
  }, [chapterData]);

  const handleGoBack = () => {
    if (returnTo === 'read-history') {
      router.replace('/(tabs)/read-history');
      return;
    }

    if (returnTo === 'manga-details' && mangaId) {
      router.replace({
        pathname: '/(tabs)/manga-details',
        params: {
          id: mangaId,
          title: mangaTitle,
          source: source || 'search',
          type: searchTypeParam || 'manga',
          ...(searchQueryParam ? { query: searchQueryParam } : {}),
          ...(searchGenresParam ? { genres: searchGenresParam } : {}),
        },
      });
    } else {
      router.back();
    }
  };

  const flushProgress = useCallback((readAt?: number) => {
    if (!mangaId || !chapter) return;
    const totalPages = pageData.length || chapterData?.pages?.length || 0;
    if (totalPages <= 0) return;
    const progressPage = Math.min(totalPages, currentPage + 1);
    if (progressPage === lastSentPageRef.current) return;
    lastSentPageRef.current = progressPage;

    void addToHistory({
      id: mangaId,
      chapter,
      title: mangaTitle,
      thumbnailUrl: chapterData?.thumbnail || thumbnailParam,
      page: progressPage,
      totalPages,
      ...(readAt ? { readAt } : {}),
    });
  }, [mangaId, chapter, mangaTitle, pageData.length, currentPage, addToHistory, chapterData?.thumbnail, thumbnailParam, chapterData?.pages?.length]);

  // Debounced progress logging (log current visible page after a short delay)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const totalPages = pageData.length || chapterData?.pages?.length || 0;
    if (!mangaId || !chapter || totalPages <= 0) return undefined;
    const progressPage = Math.min(totalPages, currentPage + 1);
    if (progressPage === lastSentPageRef.current) return undefined;

    saveTimeoutRef.current = setTimeout(() => {
      flushProgress();
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [mangaId, chapter, pageData.length, chapterData?.pages?.length, currentPage, flushProgress]);

  // Persist final progress and perform cache cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      flushProgress(Date.now());
      
      // Perform smart cache cleanup when leaving reader
      // This clears old files and manages cache size
      console.log('[MangaReader] Performing cache cleanup on unmount');
      smartCacheCleanup().catch(err => 
        console.warn('[MangaReader] Cache cleanup warning:', err)
      );
    };
  }, [flushProgress]);

  // Ensure hardware back follows the same path
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true;
      });

      return () => sub.remove();
    }, [handleGoBack])
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  const chapterNumber = chapter ? parseFloat(chapter) : NaN;
  const hasChapterNumber = Number.isFinite(chapterNumber);

  const chapterList = useMemo(() => {
    const list: string[] = [];
    if (chapterData?.chapters?.sub?.length) list.push(...chapterData.chapters.sub);
    if (chapterData?.chapters?.raw?.length) {
      chapterData.chapters.raw.forEach(ch => {
        if (!list.includes(ch)) list.push(ch);
      });
    }
    return list;
  }, [chapterData?.chapters]);

  const currentChapterIndex = useMemo(() => {
    if (!chapter || !chapterList.length) return -1;
    return chapterList.findIndex(ch => ch === chapter);
  }, [chapter, chapterList]);

  const prevChapterId = currentChapterIndex >= 0 && currentChapterIndex < chapterList.length - 1
    ? chapterList[currentChapterIndex + 1]
    : null;

  const nextChapterId = currentChapterIndex > 0
    ? chapterList[currentChapterIndex - 1]
    : null;

  const navigateToChapter = useCallback((targetChapter: string) => {
    flushProgress(Date.now());
    
    // Perform smart cache cleanup before navigating to new chapter
    // This runs in background and doesn't block navigation
    smartCacheCleanup().catch((err: any) => 
      console.warn('[MangaReader] Cache cleanup warning:', err)
    );
    
    router.replace({
      pathname: '/manga-reader',
      params: {
        mangaId,
        chapter: targetChapter,
        title: mangaTitle,
        returnTo,
        source,
        type: searchTypeParam,
        query: searchQueryParam,
        genres: searchGenresParam,
        thumbnail: thumbnailParam,
      },
    });
  }, [flushProgress, router, mangaId, mangaTitle, returnTo, source, searchTypeParam, searchQueryParam, searchGenresParam, thumbnailParam]);

  const handlePrevChapter = useCallback(() => {
    if (!prevChapterId) return;
    navigateToChapter(prevChapterId);
  }, [prevChapterId, navigateToChapter]);

  const handleNextChapter = useCallback(() => {
    if (!nextChapterId) return;
    navigateToChapter(nextChapterId);
  }, [nextChapterId, navigateToChapter]);

  // Shared values for document-wide zoom and pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const doubleTapRef = useRef(null);

  // Update zoom state
  const updateZoomState = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  // Handle double tap to zoom
  const onDoubleTap = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
    onEnd: () => {
      if (scale.value > 1) {
        // Zoom out
        scale.value = withTiming(1, { duration: 250 });
        translateX.value = withTiming(0, { duration: 250 });
        translateY.value = withTiming(0, { duration: 250 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
      } else {
        // Zoom in to 2x
        scale.value = withTiming(2, { duration: 250 });
        savedScale.value = 2;
        runOnJS(updateZoomState)(true);
      }
    },
  });

  // Pinch gesture for zoom
  const pinchGesture = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onStart: () => {
      savedScale.value = scale.value;
    },
    onActive: (event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, 0.5), 4);
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(updateZoomState)(false);
      } else if (scale.value > 4) {
        scale.value = withSpring(4, { damping: 15, stiffness: 150 });
        savedScale.value = 4;
        runOnJS(updateZoomState)(true);
      } else {
        savedScale.value = scale.value;
        const isZoomedNow = scale.value > 1;
        runOnJS(updateZoomState)(isZoomedNow);
      }
    },
  });

  // Pan gesture for moving around when zoomed
  const panGesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      if (scale.value > 1) {
        // Calculate proper bounds to prevent content from escaping the frame
        // The content grows by (scale - 1) on each side when zoomed
        const maxTranslateX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxTranslateY = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        
        const newTranslateX = savedTranslateX.value + event.translationX;
        const newTranslateY = savedTranslateY.value + event.translationY;
        
        // Clamp translation to keep content within bounds
        translateX.value = Math.min(Math.max(newTranslateX, -maxTranslateX), maxTranslateX);
        translateY.value = Math.min(Math.max(newTranslateY, -maxTranslateY), maxTranslateY);
      }
    },
    onEnd: () => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Simple page component without individual zoom
  const PageImage = memo(({ uri, index, aspectRatio, totalPages }: { uri: string; index: number; aspectRatio: number; totalPages: number }) => {
    return (
      <View style={styles.pageContainer}>
        <Image
          source={{ uri }}
          style={[
            styles.pageImage,
            { aspectRatio }
          ]}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={`page-${index}`}
          priority="high"
        />
        {/* <View style={styles.pageNumber}>
          <Text style={styles.pageNumberText}>
            {index + 1} / {totalPages}
          </Text>
        </View> */}
      </View>
    );
  }, (prevProps, nextProps) => {
    return prevProps.uri === nextProps.uri && 
           prevProps.index === nextProps.index &&
           prevProps.totalPages === nextProps.totalPages &&
           Math.abs(prevProps.aspectRatio - nextProps.aspectRatio) < 0.01;
  });

  const renderPage: ListRenderItem<PageData> = useCallback(({ item }: { item: PageData }) => {
    const aspectRatio = aspectRatiosRef.current[item.index] || 0.7;

    return (
      <PageImage
        uri={item.url}
        index={item.index}
        aspectRatio={aspectRatio}
        totalPages={pageData.length}
      />
    );
  }, [pageData.length]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" translucent />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading chapter...</Text>
      </View>
    );
  }

  if (error || !chapterData) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" translucent />
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors.dark.buttonBackground} />
        <Text style={styles.errorText}>{error || 'Could not load chapter'}</Text>
        <TouchableOpacity
          style={{ marginTop: 20, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.dark.buttonBackground }}
          onPress={handleGoBack}
        >
          <Text style={{ color: Colors.dark.text, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* Header with back button and chapter info */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.chapterInfo}>
            <Text style={styles.mangaTitle} numberOfLines={1}>
              {mangaTitle}
            </Text>
            <Text style={styles.chapterTitle}>
              Chapter {chapter}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.navButton, !prevChapterId && styles.disabledButton]}
              onPress={handlePrevChapter}
              disabled={!prevChapterId}
            >
              <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.dark.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, !nextChapterId && styles.disabledButton]}
              onPress={handleNextChapter}
              disabled={!nextChapterId}
            >
              <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vertical scrolling manga pages with document-wide zoom */}
        <TapGestureHandler
          ref={doubleTapRef}
          onGestureEvent={onDoubleTap}
          numberOfTaps={2}
        >
          <Animated.View style={{ flex: 1 }}>
            <PanGestureHandler 
              onGestureEvent={panGesture} 
              enabled={isZoomed}
              minPointers={1}
              maxPointers={1}
            >
              <Animated.View style={{ flex: 1 }}>
                <PinchGestureHandler onGestureEvent={pinchGesture}>
                  <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                    <FlatList
                      data={pageData}
                      renderItem={renderPage}
                      keyExtractor={(item) => `page-${item.index}`}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.scrollContainer}
                      onViewableItemsChanged={onViewableItemsChanged}
                      viewabilityConfig={{
                        itemVisiblePercentThreshold: 50,
                      }}
                      initialNumToRender={3}
                      maxToRenderPerBatch={2}
                      windowSize={7}
                      updateCellsBatchingPeriod={100}
                      scrollEnabled={!isZoomed}
                    />
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </TapGestureHandler>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
