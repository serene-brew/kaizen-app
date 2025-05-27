// React hooks for state management, side effects, and performance optimization
import { useState, useEffect, useMemo, useCallback } from "react";

// React Native core components for UI rendering and device interaction
import { Text, View, ScrollView, TouchableOpacity, Alert, Linking, Modal, TextInput, Image } from "react-native";

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
const APP_VERSION = "1.0.0";
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
  const { downloads, totalStorageUsed } = useDownloads();
  
  // Use state to store derived values to decouple from downloads re-renders
  const [downloadStats, setDownloadStats] = useState({
    downloadSize: '0 B',
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
      // Calculate formatted size
      const formattedSize = formatBytes(totalStorageUsed);
      
      // Calculate download counts
      const completed = downloads.filter(item => item.status === 'completed').length;
      const inProgress = downloads.filter(item => 
        ['downloading', 'pending', 'paused'].includes(item.status)
      ).length;
      
      setDownloadStats({
        downloadSize: formattedSize,
        completedDownloads: completed,
        inProgressDownloads: inProgress
      });
    });
    
    return () => cancelAnimationFrame(updateFrame);
  }, [downloads, totalStorageUsed]);

  /**
   * Utility function to format bytes into human-readable file sizes
   * Converts bytes to appropriate units (B, KB, MB, GB, etc.)
   * 
   * @param bytes - Size in bytes
   * @param decimals - Number of decimal places to show
   * @returns Formatted size string with appropriate unit
   */
  // Format bytes to human-readable size
  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

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
      Alert.alert("Error", "Failed to logout. Please try again.");
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
    Alert.alert(
      "Clear Downloads",
      "Are you sure you want to clear all downloads?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => router.push('/downloads')
        }
      ]
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

  // Extract watch history clearing function from context
  const { clearHistory: clearWatchHistory } = useWatchHistory();

  /**
   * Clear Watch History Handler
   * 
   * Shows confirmation dialog before clearing user's watch history
   * Provides destructive action warning to prevent accidental data loss
   */
  const clearHistory = useCallback(() => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your watch history?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearWatchHistory }
      ]
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
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
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
      {/* User Profile Header Section */}
      <View style={styles.header}>
        <View style={styles.accountContainer}>
          {/* User avatar placeholder */}
          <View style={styles.avatar}>
            <MaterialCommunityIcons
              name={DEFAULT_AVATAR_ICON}
              size={32}
              color={Colors.dark.secondaryText}
            />
          </View>
          {/* User information display */}
          <View style={styles.userInfo}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
          </View>
          {/* Edit profile button */}
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <MaterialCommunityIcons
              name="pencil"
              size={20}
              color={Colors.dark.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Downloads Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Downloads</Text>
        {/* Downloads overview with counts */}
        <MenuItem
          icon="folder-download"
          text="Downloads"
          value={downloadStats.inProgressDownloads > 0 ? `${downloadStats.completedDownloads} + ${downloadStats.inProgressDownloads} in progress` : `${downloadStats.completedDownloads}`}
          onPress={navigateToDownloads}
        />
        {/* Storage usage display */}
        <MenuItem
          icon="harddisk"
          text="Storage Used"
          value={downloadStats.downloadSize}
          onPress={navigateToDownloads}
        />
        {/* Clear downloads action */}
        <MenuItem
          icon="trash-can-outline"
          text="Clear Downloads"
          onPress={clearDownloads}
        />
      </View>

      {/* Watch History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {/* Navigate to watch history */}
        <MenuItem
          icon="history"
          text="Watch History"
          onPress={() => router.push('/(tabs)/history')}
        />
        {/* Clear watch history action */}
        <MenuItem
          icon="trash-can-outline"
          text="Clear History"
          onPress={clearHistory}
        />
      </View>

      {/* App Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {/* GitHub repository link */}
        <MenuItem
          icon="github"
          text="Our Project on GitHub"
          onPress={openGitHub}
        />
        {/* App information modal */}
        <MenuItem
          icon="information"
          text="About Kaizen"
          onPress={handleShowAbout}
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
              <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
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

