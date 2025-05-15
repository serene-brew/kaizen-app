import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useDownloads } from '../contexts/DownloadsContext';
import * as FileSystem from 'expo-file-system';
import { formatDistanceToNow, format } from 'date-fns';
import { styles } from '../styles/downloads.styles';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function DownloadsPage() {
  const router = useRouter();
  const { 
    downloads, 
    currentDownloads, 
    downloadQueue,
    totalStorageUsed, 
    removeDownload, 
    pauseDownload, 
    resumeDownload, 
    cancelDownload,
    clearAllDownloads,
    downloadPermissionGranted,
    requestDownloadPermissions
  } = useDownloads();
  
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  
  // Request permissions if needed
  useEffect(() => {
    const checkPermissions = async () => {
      if (!downloadPermissionGranted) {
        await requestDownloadPermissions();
      }
    };
    
    checkPermissions();
  }, [downloadPermissionGranted]);

  // Handle back button press
  const handleGoBack = () => {
    router.back();
  };
  
  // Filtered and sorted downloads
  const filteredDownloads = React.useMemo(() => {
    let items = [...downloads];
    
    // Apply filter
    if (filter === 'completed') {
      items = items.filter(item => item.status === 'completed');
    } else if (filter === 'active') {
      items = items.filter(item => 
        item.status === 'downloading' || 
        item.status === 'pending' ||
        item.status === 'paused'
      );
    }
    
    // Apply sorting
    if (sortBy === 'name') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'size') {
      items.sort((a, b) => b.size - a.size);
    } else {
      // Default sort by date, newest first
      items.sort((a, b) => b.dateAdded - a.dateAdded);
    }
    
    return items;
  }, [downloads, filter, sortBy]);
  
  // Play a downloaded episode
  const playDownload = async (item: typeof downloads[0]) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(item.filePath);
      
      if (fileInfo.exists) {
        // Navigate to a video player with the local file
        router.push({
          pathname: '/streaming',
          params: {
            id: item.animeId,
            localFile: item.filePath,
            title: item.title,
            episode: item.episodeNumber,
            audioType: item.audioType,
            isDownloaded: 'true'
          }
        });
      } else {
        Alert.alert('Error', 'File not found. It may have been deleted.');
        // Remove the download from the list
        await removeDownload(item.id);
      }
    } catch (error) {
      console.error('Error playing download:', error);
      Alert.alert('Error', 'Could not play the downloaded file');
    }
  };
  
  // Confirm and clear all downloads
  const handleClearAllDownloads = () => {
    Alert.alert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded episodes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllDownloads();
            } catch (error) {
              console.error('Error clearing downloads:', error);
              Alert.alert('Error', 'Failed to clear all downloads');
            }
          }
        }
      ]
    );
  };
  
  // Handle download actions (play, pause, resume, cancel, delete)
  const handleAction = async (item: typeof downloads[0], action: string) => {
    try {
      switch (action) {
        case 'play':
          await playDownload(item);
          break;
        case 'pause':
          await pauseDownload(item.id);
          break;
        case 'resume':
          await resumeDownload(item.id);
          break;
        case 'cancel':
          Alert.alert(
            'Cancel Download',
            'Are you sure you want to cancel this download?',
            [
              { text: 'No', style: 'cancel' },
              { 
                text: 'Yes', 
                style: 'destructive', 
                onPress: async () => await cancelDownload(item.id)
              }
            ]
          );
          break;
        case 'delete':
          Alert.alert(
            'Delete Download',
            'Are you sure you want to delete this download?',
            [
              { text: 'No', style: 'cancel' },
              { 
                text: 'Yes', 
                style: 'destructive', 
                onPress: async () => await removeDownload(item.id)
              }
            ]
          );
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error(`Error with download action ${action}:`, error);
      Alert.alert('Error', `Failed to ${action} the download`);
    }
  };
  
  // Render a download item
  const renderDownloadItem = ({ item }: { item: typeof downloads[0] }) => {
    return (
      <View style={styles.downloadItem}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => item.status === 'completed' ? playDownload(item) : null}
        >
          {/* Thumbnail with overlay for status */}
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: item.thumbnail || 'https://via.placeholder.com/100' }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            
            {/* Status overlay */}
            {item.status !== 'completed' && (
              <View style={styles.statusOverlay}>
                {item.status === 'downloading' && (
                  <>
                    <ActivityIndicator size="small" color={Colors.dark.buttonBackground} />
                    <Text style={styles.statusText}>{Math.round(item.progress * 100)}%</Text>
                  </>
                )}
                {item.status === 'pending' && (
                  <Text style={styles.statusText}>Queued</Text>
                )}
                {item.status === 'failed' && (
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#f44336" />
                )}
                {item.status === 'paused' && (
                  <MaterialCommunityIcons name="pause" size={18} color="#ffb74d" />
                )}
              </View>
            )}
            
            {/* Play Icon for completed downloads */}
            {item.status === 'completed' && (
              <View style={styles.playIconContainer}>
                <MaterialCommunityIcons name="play-circle" size={32} color="white" />
              </View>
            )}
          </View>
          
          {/* Download info */}
          <View style={styles.downloadInfo}>
            <Text style={styles.downloadTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.episodeInfo}>
              Episode {item.episodeNumber} • {item.audioType === 'sub' ? 'Subbed' : 'Dubbed'}
            </Text>
            
            {/* Show different info based on status */}
            {item.status === 'completed' ? (
              <Text style={styles.downloadMeta}>
                {formatBytes(item.size)} • {format(new Date(item.dateAdded), 'MMM d, yyyy')}
              </Text>
            ) : (
              <Text style={styles.downloadMeta}>
                {item.status === 'downloading' ? `${formatBytes(item.size * item.progress)} of ${formatBytes(item.size || 0)}` : 'Size unknown'} 
                • Added {formatDistanceToNow(new Date(item.dateAdded), { addSuffix: true })}
              </Text>
            )}
          </View>
          
          {/* Actions */}
          <View style={styles.actions}>
            {item.status === 'downloading' && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'pause')}
              >
                <MaterialCommunityIcons name="pause" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
            {item.status === 'paused' && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'resume')}
              >
                <MaterialCommunityIcons name="play" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
            {['downloading', 'pending', 'paused'].includes(item.status) && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'cancel')}
              >
                <MaterialCommunityIcons name="close" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
            {['completed', 'failed'].includes(item.status) && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleAction(item, 'delete')}
              >
                <MaterialCommunityIcons name="delete" size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Progress bar for downloading items */}
        {item.status === 'downloading' && (
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${item.progress * 100}%` }
              ]} 
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        {downloads.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAllDownloads}>
            <MaterialCommunityIcons name="delete" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Storage info */}
      <View style={styles.storageInfo}>
        <MaterialCommunityIcons name="folder-download" size={20} color={Colors.dark.secondaryText} />
        <Text style={styles.storageText}>
          Total storage: {formatBytes(totalStorageUsed)}
        </Text>
      </View>
      
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filters}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]} 
            onPress={() => setFilter('all')}
          >
            <Text 
              style={[styles.filterText, filter === 'all' && styles.activeFilterText]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]} 
            onPress={() => setFilter('completed')}
          >
            <Text 
              style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}
            >
              Completed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'active' && styles.activeFilterButton]} 
            onPress={() => setFilter('active')}
          >
            <Text 
              style={[styles.filterText, filter === 'active' && styles.activeFilterText]}
            >
              Active
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => {
            const nextSortOptions: { [key: string]: 'date' | 'name' | 'size' } = {
              'date': 'name',
              'name': 'size',
              'size': 'date'
            };
            setSortBy(nextSortOptions[sortBy]);
          }}
        >
          <MaterialCommunityIcons 
            name={
              sortBy === 'date' ? "sort-calendar-descending" :
              sortBy === 'name' ? "sort-alphabetical-ascending" :
              "sort-numeric-descending"
            } 
            size={20} 
            color={Colors.dark.text} 
          />
          <Text style={styles.sortText}>
            {sortBy === 'date' ? "Date" : sortBy === 'name' ? "Name" : "Size"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Download list */}
      {downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="download-off" 
            size={48} 
            color={Colors.dark.secondaryText} 
          />
          <Text style={styles.emptyText}>No downloads yet</Text>
        </View>
      ) : filteredDownloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="filter-remove" 
            size={48} 
            color={Colors.dark.secondaryText} 
          />
          <Text style={styles.emptyText}>No {filter} downloads found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDownloads}
          renderItem={renderDownloadItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Download queue info */}
      {downloadQueue.length > 0 && (
        <View style={styles.queueInfoContainer}>
          <Text style={styles.queueInfoText}>
            {downloadQueue.length} {downloadQueue.length === 1 ? 'episode' : 'episodes'} in queue
          </Text>
        </View>
      )}
    </View>
  );
}

