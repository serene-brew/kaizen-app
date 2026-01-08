import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, BackHandler } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import Colors from '../../constants/Colors';
import { showConfirmAlert } from '../../components/CustomAlert';
import { useReadHistory, ReadHistoryItem } from '../../contexts/ReadHistoryContext';
import { styles } from '../../styles/readHistory.styles';

const createUniqueKey = (item: ReadHistoryItem): string => `${item.id}-${item.chapter}-${item.readAt}`;

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSafePage = (page?: number, totalPages?: number): number | null => {
  if (!totalPages || totalPages <= 0) return null;
  return Math.min(Math.max(typeof page === 'number' ? Math.round(page) : 1, 1), totalPages);
};

const formatProgress = (page?: number, totalPages?: number): string => {
  if (!totalPages || totalPages <= 0) return '';
  const safePage = getSafePage(page, totalPages);
  if (!safePage) return '';
  return `${safePage}/${totalPages} pages`;
};

const ChapterItem = memo(({ item, onRemove, onNavigate }: { item: ReadHistoryItem; onRemove: (mangaId: string, chapter: string) => void; onNavigate: (item: ReadHistoryItem) => void }) => {
  return (
    <TouchableOpacity style={styles.chapterItem} onPress={() => onNavigate(item)}>
      <View style={styles.chapterHeader}>
        <View style={styles.chapterDetails}>
          <Text style={styles.chapterLabel}>Chapter {item.chapter}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(item.id, item.chapter)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialCommunityIcons name="close" size={16} color={Colors.dark.secondaryText} />
        </TouchableOpacity>
      </View>

      {item.totalPages && item.totalPages > 0 && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, ((getSafePage(item.page, item.totalPages) ?? 0) / item.totalPages) * 100)}%`,
              },
            ]}
          />
        </View>
      )}

      <View style={styles.chapterFooter}>
        <Text style={styles.progressText}>{formatProgress(item.page, item.totalPages)}</Text>
        <Text style={styles.readDate}>{formatDate(item.readAt)}</Text>
      </View>
    </TouchableOpacity>
  );
});

const MangaGroup = memo(({ mangaId, items, onNavigateToDetails, onNavigateToReader, onRemoveItem }: { mangaId: string; items: ReadHistoryItem[]; onNavigateToDetails: (id: string, title: string, thumbnailUrl?: string) => void; onNavigateToReader: (item: ReadHistoryItem) => void; onRemoveItem: (id: string, chapter: string) => void }) => {
  const first = items[0];

  return (
    <View style={styles.mangaGroup}>
      <TouchableOpacity style={styles.mangaHeader} onPress={() => onNavigateToDetails(first.id, first.title, first.thumbnailUrl)}>
        <Image source={{ uri: first.thumbnailUrl }} style={styles.mangaThumbnail} defaultSource={require('../../assets/images/icon.png')} />
        <View style={styles.mangaInfo}>
          <Text style={styles.mangaTitle} numberOfLines={1}>{first.title}</Text>
          <Text style={styles.chapterCount}>{items.length} chapter{items.length > 1 ? 's' : ''} read</Text>
          <Text style={styles.lastRead}>Last read: {formatDate(first.readAt)}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.dark.secondaryText} />
      </TouchableOpacity>

      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chaptersList}
        keyExtractor={createUniqueKey}
        renderItem={({ item }) => (
          <ChapterItem item={item} onRemove={onRemoveItem} onNavigate={onNavigateToReader} />
        )}
      />
    </View>
  );
});

export default function ReadHistoryPage() {
  const router = useRouter();
  const { history, isLoading, isSyncing, isAuthenticated, refreshHistory, removeFromHistory, clearHistory } = useReadHistory();

  const [groupedHistory, setGroupedHistory] = useState<Record<string, ReadHistoryItem[]>>({});
  const [sortedIds, setSortedIds] = useState<string[]>([]);

  const handleGoBack = () => {
    router.replace('/(tabs)/more');
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const grouped = history.reduce((acc: Record<string, ReadHistoryItem[]>, item) => {
      if (!acc[item.id]) acc[item.id] = [];

      const existingIndex = acc[item.id].findIndex(existing => existing.chapter === item.chapter);
      if (existingIndex >= 0) {
        if (item.readAt > acc[item.id][existingIndex].readAt) {
          acc[item.id][existingIndex] = item;
        }
      } else {
        acc[item.id].push(item);
      }
      return acc;
    }, {});

    Object.keys(grouped).forEach(id => {
      grouped[id].sort((a, b) => b.readAt - a.readAt);
    });

    const ids = Object.keys(grouped).sort((a, b) => {
      const latestA = grouped[a][0]?.readAt || 0;
      const latestB = grouped[b][0]?.readAt || 0;
      return latestB - latestA;
    });

    setGroupedHistory(grouped);
    setSortedIds(ids);
  }, [history]);

  const handleRemoveItem = useCallback((mangaId: string, chapter: string) => {
    showConfirmAlert(
      'Remove from History',
      'Remove this chapter from your read history?',
      () => removeFromHistory(mangaId, chapter)
    );
  }, [removeFromHistory]);

  const handleClearHistory = useCallback(() => {
    showConfirmAlert(
      'Clear History',
      'Are you sure you want to clear your entire read history?',
      clearHistory
    );
  }, [clearHistory]);

  const navigateToDetails = useCallback((mangaId: string, title: string, thumbnailUrl?: string) => {
    router.push({
      pathname: '/(tabs)/manga-details',
      params: {
        id: mangaId,
        title,
        thumbnail: thumbnailUrl,
        source: 'read-history',
      },
    });
  }, [router]);

  const navigateToReader = useCallback((item: ReadHistoryItem) => {
    router.push({
      pathname: '/manga-reader',
      params: {
        mangaId: item.id,
        chapter: item.chapter,
        title: item.title,
        returnTo: 'read-history',
        source: 'read-history',
      },
    });
  }, [router]);

  const renderGroup = ({ item }: { item: string }) => (
    <MangaGroup
      mangaId={item}
      items={groupedHistory[item] || []}
      onNavigateToDetails={navigateToDetails}
      onNavigateToReader={navigateToReader}
      onRemoveItem={handleRemoveItem}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="light" translucent />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading read history...</Text>
      </View>
    );
  }

  const Header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Read History</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={[styles.iconButton, (!isAuthenticated || isSyncing) && styles.disabledButton]}
          disabled={!isAuthenticated || isSyncing}
          onPress={refreshHistory}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={Colors.dark.text} />
          ) : (
            <MaterialCommunityIcons name="cloud-sync-outline" size={20} color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, styles.dangerButton, (!isAuthenticated || isSyncing || history.length === 0) && styles.disabledButton]}
          onPress={handleClearHistory}
          disabled={!isAuthenticated || isSyncing || history.length === 0}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={isAuthenticated && history.length > 0 ? Colors.dark.text : Colors.dark.secondaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" translucent />
      {Header}

      {history.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="book-open-variant" size={64} color={Colors.dark.secondaryText} />
          <Text style={styles.emptyText}>No chapters read yet</Text>
          <Text style={styles.emptySubtext}>
            {isAuthenticated
              ? 'Start reading a manga to see your history here.'
              : 'Sign in to sync and track your reading progress.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedIds}
          keyExtractor={(id) => id}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
