// React hooks for state management, side effects, and performance optimization
import { useState, useEffect, useMemo, useCallback } from "react";

// React Native core components for UI rendering and device interaction
import { Text, View, ScrollView, TouchableOpacity, Linking, Modal, TextInput, Image } from "react-native";

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Expo Router for navigation
import { router } from "expo-router";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Global context for user authentication and app state
import { useGlobalContext } from "../../context/GlobalProvider";

// Component-specific styles
import { styles } from "../../styles/more.styles";

// Appwrite account service for user management
import { account } from "../../lib/appwrite";

// Expo constants for app version and build info
import Constants from 'expo-constants';

// Context hooks for downloads and watch history management
import { useDownloads } from '../../contexts/DownloadsContext';
import { useWatchHistory } from '../../contexts/WatchHistoryContext';
import { useReadHistory } from '../../contexts/ReadHistoryContext';

// Version service for manual update checking
import { checkForUpdatesManually, versionService } from '../../lib/versionService';

// Custom alert components for dark-themed alerts
import { showCustomAlert, showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../components/CustomAlert';

/**
 * TypeScript Interface Definitions
 * Define prop structures for component type safety and better development experience
 */
interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap; // Icon name from MaterialCommunityIcons
  text: string; // Display text for menu item
  onPress: () => void; // Callback function when item is pressed
  value?: string; // Optional value to display on the right
  danger?: boolean; // Whether to style as dangerous action (red color)
}

// Static assets and constants
const AppIcon = require('../../assets/images/icon.png');
const GITHUB_URL = "https://github.com/serene-brew/kaizen-app";
const APP_VERSION = "3.0.1";
const DEFAULT_AVATAR_ICON = 'account-circle';

/**
 * More Component
 * 
 * User settings and account management screen that provides:
 * - User profile display and editing
 * - Downloads management and storage information
 * - Watch history access and clearing
 * - App information and external links
 * - Logout functionality
 * - Modal dialogs for profile editing and app information
 */
export default function More() {
  // Extract user data and authentication functions from global context
  const { user, logout, setUser } = useGlobalContext();
  
  // Local state for modal visibility and form data
  const [showEditModal, setShowEditModal] = useState(false); // Profile edit modal state
  const [showAboutModal, setShowAboutModal] = useState(false); // About app modal state
  const [username, setUsername] = useState(user?.name || 'User'); // Editable username
  const [isLoading, setIsLoading] = useState(false); // Profile save loading state

  /**
   * Downloads Statistics Management
   * 
   * Uses downloads context with performance optimizations to prevent UI freezing.
   * Calculates and formats download statistics including storage usage and counts.
   */
  // Use downloads context with optimizations to prevent UI freezing
  const { downloads } = useDownloads();
  
  // Use state to store derived values to decouple from downloads re-renders
  const [downloadStats, setDownloadStats] = useState({
    completedDownloads: 0,
    inProgressDownloads: 0
  });
  
  /**
   * Download Statistics Update Effect
   * 
   * Updates download statistics in a non-blocking way using requestAnimationFrame
   * to ensure UI updates don't freeze the main thread during heavy calculations.
   */
  // Update derived stats in a non-blocking way using useEffect
  useEffect(() => {
    // Use requestAnimationFrame to ensure UI updates don't block the main thread
    const updateFrame = requestAnimationFrame(() => {
      // Calculate download counts
      const completed = downloads.filter(item => item.status === 'completed').length;
      const inProgress = downloads.filter(item => 
        ['downloading', 'pending', 'paused'].includes(item.status)
      ).length;
      
      setDownloadStats({
        completedDownloads: completed,
        inProgressDownloads: inProgress
      });
    });
    
    return () => cancelAnimationFrame(updateFrame);
  }, [downloads]);



  /**
   * User Data Synchronization Effect
   * 
   * Updates local username state when global user data changes
   * Ensures UI stays in sync with authentication state
   */
  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setUsername(user.name || 'User');
    }
  }, [user]);

  /**
   * Logout Handler
   * 
   * Handles user logout process with error handling
   * Navigates back to authentication screen on success
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.error('Logout error:', error);
      showErrorAlert("Error", "Failed to logout. Please try again.");
    }
  }, [logout]);

  /**
   * External Link Handler
   * 
   * Opens GitHub repository in external browser
   * Checks if URL can be opened before attempting to open
   */
  const openGitHub = useCallback(async () => {
    const canOpen = await Linking.canOpenURL(GITHUB_URL);
    if (canOpen) {
      await Linking.openURL(GITHUB_URL);
    }
  }, []);

  /**
   * Clear Downloads Handler
   * 
   * Shows confirmation dialog before navigating to downloads management
   * Provides destructive action warning to prevent accidental clearing
   */
  const clearDownloads = useCallback(() => {
    showConfirmAlert(
      "Clear Downloads",
      "Are you sure you want to clear all downloads?",
      () => router.push('/downloads'), // onConfirm
      undefined // onCancel (default behavior)
    );
  }, []);

  /**
   * Downloads Navigation Handler
   * 
   * Navigates to downloads management screen
   */
  const navigateToDownloads = useCallback(() => {
    router.push('/downloads');
  }, []);

  // Extract watch history data and functions from context
  const { 
    history, 
    clearHistory: clearWatchHistory, 
    isLoading: historyLoading,
    getLastWatchedEpisode
  } = useWatchHistory();

  // Extract read history data
  const { history: readHistory } = useReadHistory();

  /**
   * Watch History Statistics
   * 
   * Calculate recent watch history stats for display
   */
  const watchHistoryStats = useMemo(() => {
    const recentItems = history.slice(0, 3); // Get 3 most recent items
    const totalWatched = history.length;
    const uniqueAnime = new Set(history.map(item => item.id)).size;
    
    return {
      recentItems,
      totalWatched,
      uniqueAnime
    };
  }, [history]);

  const readHistoryStats = useMemo(() => {
    const recentItems = readHistory.slice(0, 3);
    const totalRead = readHistory.length;
    const uniqueManga = new Set(readHistory.map(item => item.id)).size;

    return {
      recentItems,
      totalRead,
      uniqueManga,
    };
  }, [readHistory]);

  const getSafeReadPage = (page?: number, totalPages?: number): number | null => {
    if (!totalPages || totalPages <= 0) return null;
    return Math.min(Math.max(typeof page === 'number' ? Math.round(page) : 1, 1), totalPages);
  };

  /**
   * Clear Watch History Handler
   * 
   * Shows confirmation dialog before clearing user's watch history
   * Provides destructive action warning to prevent accidental data loss
   */
  const clearHistory = useCallback(() => {
    showConfirmAlert(
      "Clear History",
      "Are you sure you want to clear your watch history?",
      clearWatchHistory, // onConfirm
      undefined // onCancel (default behavior)
    );
  }, [clearWatchHistory]);

  
  /**
   * Profile Edit Handler
   * 
   * Opens the profile editing modal
   */
  const handleEditProfile = useCallback(() => {
    setShowEditModal(true);
  }, []);
  
  /**
   * Manual Update Check Handler
   * 
   * Triggers manual version checking when user requests it
   * Shows feedback regardless of update availability
   */
  const handleCheckForUpdates = useCallback(async () => {
    await checkForUpdatesManually();
  }, []);

  /**
   * About Modal Handler
   * 
   * Opens the app information modal
   */
  const handleShowAbout = useCallback(() => {
    setShowAboutModal(true);
  }, []);
  
  /**
   * Profile Save Handler
   * 
   * Handles saving profile changes to Appwrite backend
   * Updates global user state with new information
   * Provides user feedback on success/failure
   */
  const saveProfile = async () => {
    setIsLoading(true);
    try {
      // Update name in Appwrite
      await account.updateName(username);
      
      // Get updated user data
      const updatedUser = await account.get();
      
      // Update global user context
      if (setUser) {
        setUser(updatedUser);
      }
      
      setShowEditModal(false);
      showSuccessAlert("Success", "Profile updated successfully");
    } catch (error) {
      console.error('Profile update error:', error);
      showErrorAlert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * MenuItem Component
   * 
   * Memoized reusable component for menu items with consistent styling
   * Prevents unnecessary re-renders for better performance
   * 
   * Features:
   * - Icon and text display
   * - Optional value display on the right
   * - Danger styling for destructive actions
   * - Chevron indicator for navigation
   */
  // Memoize the MenuItem component to prevent unnecessary re-renders
  const MenuItem = useCallback(({ icon, text, onPress, value, danger }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        {/* Menu item icon */}
        <View style={styles.menuIcon}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={danger ? "#DC3545" : Colors.dark.secondaryText}
          />
        </View>
        {/* Menu item text */}
        <Text style={[styles.menuText, danger && styles.dangerText]}>{text}</Text>
      </View>
      {/* Value display or chevron indicator */}
      {value ? (
        <TouchableOpacity onPress={onPress} style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.menuValue}>{value}</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={Colors.dark.secondaryText}
            style={{marginLeft: 4}}
          />
        </TouchableOpacity>
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={Colors.dark.secondaryText}
        />
      )}
    </TouchableOpacity>
  ), []);

  return (
    <ScrollView style={styles.container}>
      {/* Watch History Hero Section - Most Important Feature */}
      <View style={styles.heroSection}>
        <TouchableOpacity 
          style={styles.watchHistoryHero}
          onPress={() => router.push('/(tabs)/history')}
          activeOpacity={0.8}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleSection}>
              <MaterialCommunityIcons
                name="history"
                size={32}
                color={Colors.dark.buttonBackground}
              />
              <View style={styles.heroTitleContainer}>
                <Text style={styles.heroTitle}>Watch History</Text>
                <Text style={styles.heroSubtitle}>Continue where you left off</Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={Colors.dark.buttonBackground}
            />
          </View>
          
          {/* Show last watched anime if available */}
          {watchHistoryStats.recentItems.length > 0 && (
            <View style={styles.lastWatchedSection}>
              <Text style={styles.lastWatchedLabel}>Last Watched</Text>
              <TouchableOpacity 
                style={styles.lastWatchedItem}
                onPress={() => router.push({
                  pathname: "/streaming",
                  params: { 
                    id: watchHistoryStats.recentItems[0].id,
                    audioType: watchHistoryStats.recentItems[0].audioType,
                    episode: watchHistoryStats.recentItems[0].episodeNumber.toString(),
                    title: watchHistoryStats.recentItems[0].englishName,
                    thumbnail: watchHistoryStats.recentItems[0].thumbnailUrl
                  }
                })}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: watchHistoryStats.recentItems[0].thumbnailUrl }}
                  style={styles.lastWatchedThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.lastWatchedContent}>
                  <Text style={styles.lastWatchedAnime} numberOfLines={2}>
                    {watchHistoryStats.recentItems[0].englishName}
                  </Text>
                  <Text style={styles.lastWatchedEpisode}>
                    Episode {watchHistoryStats.recentItems[0].episodeNumber} • {watchHistoryStats.recentItems[0].audioType.toUpperCase()}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${Math.min(
                              (watchHistoryStats.recentItems[0].position / watchHistoryStats.recentItems[0].duration) * 100, 
                              100
                            )}%` 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round((watchHistoryStats.recentItems[0].position / watchHistoryStats.recentItems[0].duration) * 100)}% completed
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.dark.secondaryText}
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Empty State */}
          {watchHistoryStats.totalWatched === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="television-play"
                size={48}
                color={Colors.dark.secondaryText}
              />
              <Text style={styles.emptyText}>Start watching to track your progress</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Read History Hero Section */}
      <View style={styles.heroSection}>
        <TouchableOpacity 
          style={styles.watchHistoryHero}
          onPress={() => router.push('/(tabs)/read-history')}
          activeOpacity={0.8}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleSection}>
              <MaterialCommunityIcons
                name="book-clock"
                size={32}
                color={Colors.dark.buttonBackground}
              />
              <View style={styles.heroTitleContainer}>
                <Text style={styles.heroTitle}>Read History</Text>
                <Text style={styles.heroSubtitle}>Resume your manga chapters</Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={Colors.dark.buttonBackground}
            />
          </View>
          
          {/* Show last read manga if available */}
          {readHistoryStats.recentItems.length > 0 && (
            <View style={styles.lastWatchedSection}>
              <Text style={styles.lastWatchedLabel}>Last Read</Text>
              <TouchableOpacity 
                style={styles.lastWatchedItem}
                onPress={() => router.push({
                  pathname: '/manga-reader',
                  params: {
                    mangaId: readHistoryStats.recentItems[0].id,
                    chapter: readHistoryStats.recentItems[0].chapter,
                    title: readHistoryStats.recentItems[0].title,
                    returnTo: 'read-history',
                    source: 'read-history',
                  }
                })}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: readHistoryStats.recentItems[0].thumbnailUrl }}
                  style={styles.lastWatchedThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.lastWatchedContent}>
                  <Text style={styles.lastWatchedAnime} numberOfLines={2}>
                    {readHistoryStats.recentItems[0].title}
                  </Text>
                  <Text style={styles.lastWatchedEpisode}>
                    Chapter {readHistoryStats.recentItems[0].chapter}
                  </Text>
                  {readHistoryStats.recentItems[0].totalPages ? (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBackground}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${Math.min(
                                ((getSafeReadPage(readHistoryStats.recentItems[0].page, readHistoryStats.recentItems[0].totalPages) ?? 0) / readHistoryStats.recentItems[0].totalPages!) * 100,
                                100
                              )}%`
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {`${getSafeReadPage(readHistoryStats.recentItems[0].page, readHistoryStats.recentItems[0].totalPages) ?? 1} / ${readHistoryStats.recentItems[0].totalPages} pages`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.progressText}>Tap to continue reading</Text>
                  )}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.dark.secondaryText}
                />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Empty State */}
          {readHistoryStats.totalRead === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={48}
                color={Colors.dark.secondaryText}
              />
              <Text style={styles.emptyText}>Start reading to track your progress</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Downloads Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Downloads & Storage</Text>
        {/* Downloads overview with counts */}
        <MenuItem
          icon="folder-download"
          text="My Downloads"
          value={downloadStats.inProgressDownloads > 0 ? `${downloadStats.completedDownloads} + ${downloadStats.inProgressDownloads} downloading` : `${downloadStats.completedDownloads} episodes`}
          onPress={navigateToDownloads}
        />
        {/* Clear downloads action */}
        <MenuItem
          icon="trash-can-outline"
          text="Clear All Downloads"
          onPress={clearDownloads}
        />
      </View>

      {/* App Features & Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App & Settings</Text>
        {/* Check for updates manually */}
        <MenuItem
          icon="update"
          text="Check for Updates"
          onPress={handleCheckForUpdates}
        />
        {/* App information modal */}
        <MenuItem
          icon="information-outline"
          text="About Kaizen"
          onPress={handleShowAbout}
        />
        {/* GitHub repository link */}
        <MenuItem
          icon="github"
          text="View on GitHub"
          onPress={openGitHub}
        />
      </View>

      {/* Account Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {/* Logout action with danger styling */}
        <MenuItem
          icon="logout"
          text="Logout"
          onPress={handleLogout}
          danger
        />
      </View>

      {/* User Profile Section - Bottom */}
      <View style={styles.profileSection}>
        {/* <Text style={styles.sectionTitle}>Profile</Text> */}
        <View style={styles.profileInfo}>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>
          </View>
          <TouchableOpacity style={styles.profileEditButton} onPress={handleEditProfile}>
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={Colors.dark.buttonBackground}
            />
            {/* <Text style={styles.profileEditText}>Edit</Text> */}
          </TouchableOpacity>
        </View>
      </View>

      {/* App branding footer */}
      <Text style={styles.brandText}>Kaizen by SereneBrew</Text>
      
      {/* Profile Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal header */}
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            {/* Username input field */}
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.dark.secondaryText}
              editable={!isLoading}
            />
            
            {/* Modal action buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.saveButton, 
                  isLoading && styles.disabledButton
                ]}
                onPress={saveProfile}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* About Kaizen App Information Modal */}
      <Modal
        visible={showAboutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* App branding header */}
            <View style={styles.aboutHeader}>
              <TouchableOpacity style={styles.aboutLogo}>
                <Image
                  source={AppIcon}
                  style={styles.appIconImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <Text style={styles.aboutTitle}>Kaizen</Text>
              <Text style={styles.aboutVersion}>Version {versionService.getCurrentVersion()}</Text>
            </View>
            
            {/* App description and history */}
            <Text style={styles.aboutDescription}>
              Kaizen initially started as an anime streaming TUI app for Linux and Unix based systems. 
              The success of that led to the making of Kaizen mobile app.
            </Text>
            
            <Text style={styles.aboutDescription}>
              Enjoy your experience, and let Kaizen be your companion on your journey into the world of anime.
            </Text>
            
            {/* Developer credits with GitHub links */}
            <View style={styles.aboutFeatures}>
              <Text style={styles.aboutFeatureTitle}>Developed by:</Text>
              <TouchableOpacity style={styles.developerLink} onPress={() => Linking.openURL('https://github.com/ImonChakraborty')}>
                <View style={styles.aboutFeatureItem}>
                  <MaterialCommunityIcons name="github" size={18} color={Colors.dark.buttonBackground} />
                  <Text style={styles.aboutFeatureText}>RiserSama</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.developerLink} onPress={() => Linking.openURL('https://github.com/mintRaven-05')}>
                <View style={styles.aboutFeatureItem}>
                  <MaterialCommunityIcons name="github" size={18} color={Colors.dark.buttonBackground} />
                  <Text style={styles.aboutFeatureText}>mintRaven</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.developerLink} onPress={() => Linking.openURL('https://github.com/serene-brew')}>
                <View style={styles.aboutFeatureItem}>
                  <MaterialCommunityIcons name="github" size={18} color={Colors.dark.buttonBackground} />
                  <Text style={styles.aboutFeatureText}>SereneBrew Organization</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Close modal button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

