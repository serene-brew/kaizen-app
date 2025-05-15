import { useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity, Alert, Linking, Modal, TextInput, Image } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { useGlobalContext } from "../../context/GlobalProvider";
import { styles } from "../../styles/more.styles";
import { account } from "../../lib/appwrite";
import Constants from 'expo-constants';
import { useDownloads } from '../../contexts/DownloadsContext';
import { useWatchHistory } from '../../contexts/WatchHistoryContext';

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  onPress: () => void;
  value?: string;
  danger?: boolean;
}

const AppIcon = require('../../assets/images/icon.png');

const GITHUB_URL = "https://github.com/serene-brew/kaizen-app";
const APP_VERSION = "1.0.0";
const DEFAULT_AVATAR_ICON = 'account-circle';

export default function More() {
  const { user, logout, setUser } = useGlobalContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [username, setUsername] = useState(user?.name || 'User');
  const [isLoading, setIsLoading] = useState(false);

  // Use downloads context
  const { downloads, totalStorageUsed } = useDownloads();

  // Calculate download size and count
  const downloadSize = formatBytes(totalStorageUsed);
  const completedDownloads = downloads.filter(item => item.status === 'completed').length;
  const inProgressDownloads = downloads.filter(item => 
    ['downloading', 'pending', 'paused'].includes(item.status)
  ).length;

  // Format bytes to human-readable size
  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setUsername(user.name || 'User');
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const openGitHub = async () => {
    const canOpen = await Linking.canOpenURL(GITHUB_URL);
    if (canOpen) {
      await Linking.openURL(GITHUB_URL);
    }
  };

  const clearDownloads = () => {
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
  };

  const navigateToDownloads = () => {
    router.push('/downloads');
  };

  const { clearHistory: clearWatchHistory } = useWatchHistory();

  const clearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your watch history?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearWatchHistory }
      ]
    );
  };
  
  const handleEditProfile = () => {
    setShowEditModal(true);
  };
  
  const handleShowAbout = () => {
    setShowAboutModal(true);
  };
  
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

  const MenuItem = ({ icon, text, onPress, value, danger }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <View style={styles.menuIcon}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={danger ? "#DC3545" : Colors.dark.secondaryText}
          />
        </View>
        <Text style={[styles.menuText, danger && styles.dangerText]}>{text}</Text>
      </View>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={Colors.dark.secondaryText}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.accountContainer}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons
              name={DEFAULT_AVATAR_ICON}
              size={32}
              color={Colors.dark.secondaryText}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <MaterialCommunityIcons
              name="pencil"
              size={20}
              color={Colors.dark.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Downloads</Text>
        <MenuItem
          icon="folder-download"
          text="Downloads"
          value={inProgressDownloads > 0 ? `${completedDownloads} + ${inProgressDownloads} in progress` : `${completedDownloads}`}
          onPress={navigateToDownloads}
        />
        <MenuItem
          icon="harddisk"
          text="Storage Used"
          value={downloadSize}
          onPress={navigateToDownloads}
        />
        <MenuItem
          icon="trash-can-outline"
          text="Clear Downloads"
          onPress={clearDownloads}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        <MenuItem
          icon="history"
          text="Watch History"
          onPress={() => router.push('/(tabs)/history')}
        />
        <MenuItem
          icon="trash-can-outline"
          text="Clear History"
          onPress={clearHistory}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <MenuItem
          icon="github"
          text="Our Project on GitHub"
          onPress={openGitHub}
        />
        <MenuItem
          icon="information"
          text="About Kaizen"
          onPress={handleShowAbout}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem
          icon="logout"
          text="Logout"
          onPress={handleLogout}
          danger
        />
      </View>

      <Text style={styles.brandText}>Kaizen by SereneBrew</Text>
      
      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.dark.secondaryText}
              editable={!isLoading}
            />
            
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
      
      {/* About Kaizen Modal */}
      <Modal
        visible={showAboutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
            
            <Text style={styles.aboutDescription}>
              Kaizen initially started as an anime streaming TUI app for Linux and Unix based systems. 
              The success of that led to the making of Kaizen mobile app.
            </Text>
            
            <Text style={styles.aboutDescription}>
              Enjoy your experience, and let Kaizen be your companion on your journey into the world of anime.
            </Text>
            
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

