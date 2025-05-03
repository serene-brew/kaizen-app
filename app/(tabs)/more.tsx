import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { useGlobalContext } from "../../context/GlobalProvider";
import { styles } from "../../styles/more.styles";

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
  onPress: () => void;
  value?: string;
  danger?: boolean;
}

const GITHUB_URL = "https://github.com/serene-brew/kaizen-app";
const APP_VERSION = "1.0.0";

export default function More() {
  const { user, logout } = useGlobalContext();
  const [downloadSize, setDownloadSize] = useState("1.2 GB"); // Placeholder value

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
          onPress: () => setDownloadSize("0 B")
        }
      ]
    );
  };

  const clearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your watch history?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => {} }
      ]
    );
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
              name="account"
              size={32}
              color={Colors.dark.secondaryText}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Downloads</Text>
        <MenuItem
          icon="folder-download"
          text="Downloads"
          value={downloadSize}
          onPress={() => {}}
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
          onPress={() => {}}
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
          onPress={() => {}}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem
          icon="logout"
          text="Logout"
          onPress={handleLogout}
        />
      </View>

      <Text style={styles.versionText}>Version {APP_VERSION}</Text>
    </ScrollView>
  );
}
