import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { formatDistanceToNow } from 'date-fns';

import Colors from '../../constants/Colors';
import { styles } from '../../styles/readlist.styles';
import { useReadlist } from '../../contexts/ReadlistContext';
import { showConfirmAlert } from '../../components/CustomAlert';

export default function ReadlistPage() {
  const { readlist, isLoading, isSyncing, isAuthenticated, removeFromReadlist, clearReadlist, refreshReadlist, sortReadlist } = useReadlist();
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  const handleOpenDetails = (id: string, title: string) => {
    router.push({
      pathname: '/(tabs)/manga-details',
      params: { id, title, source: 'readlist' }
    });
  };

  const handleRemove = (id: string) => {
    removeFromReadlist(id);
  };

  const handleClear = () => {
    if (readlist.length === 0) {
      return;
    }

    showConfirmAlert(
      'Clear Readlist',
      'Remove every manga from your readlist?',
      async () => {
        await clearReadlist();
      }
    );
  };

  const toggleSort = () => {
    const next = sortBy === 'recent' ? 'name' : 'recent';
    setSortBy(next);
    sortReadlist(next);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading readlist...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Loading readlist...</Text>
      </View>
    );
  }

  if (readlist.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.title}>My Readlist</Text>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.iconButton, (!isAuthenticated || isSyncing) && styles.disabledButton]}
              onPress={refreshReadlist}
              disabled={!isAuthenticated || isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.dark.text} />
              ) : (
                <MaterialCommunityIcons name="cloud-sync" size={22} color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={toggleSort}>
              <MaterialCommunityIcons
                name={sortBy === 'recent' ? 'sort-clock-descending' : 'sort-alphabetical-ascending'}
                size={22}
                color={Colors.dark.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
              <MaterialCommunityIcons name="delete" size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="book-open-outline" size={72} color={Colors.dark.secondaryText} />
          <Text style={styles.emptyText}>Your readlist is empty</Text>
          <Text style={styles.emptyHint}>Browse the new manga section on Explore to start building it.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>My Readlist</Text>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.iconButton, (!isAuthenticated || isSyncing) && styles.disabledButton]}
            onPress={refreshReadlist}
            disabled={!isAuthenticated || isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.dark.text} />
            ) : (
              <MaterialCommunityIcons name="cloud-sync" size={22} color={isAuthenticated ? Colors.dark.text : Colors.dark.secondaryText} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={toggleSort}>
            <MaterialCommunityIcons
              name={sortBy === 'recent' ? 'sort-clock-descending' : 'sort-alphabetical-ascending'}
              size={22}
              color={Colors.dark.text}
            />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
            <MaterialCommunityIcons name="delete" size={22} color={Colors.dark.text} />
          </TouchableOpacity> */}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {readlist.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleOpenDetails(item.id, item.title)}
            >
              <View style={styles.cover}>
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={styles.coverImage} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="image" size={40} color={Colors.dark.secondaryText} />
                )}
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                  <MaterialCommunityIcons name="book-remove" size={22} color={Colors.dark.buttonBackground} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.meta}>
                Added {formatDistanceToNow(item.dateAdded, { addSuffix: true })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
