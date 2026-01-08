// Expo Router tab navigation component
import { Tabs } from "expo-router";

// Material Community Icons for tab bar icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// React hooks for state management and side effects
import { useEffect, useState } from "react";

// React Native components for keyboard handling and platform detection
import { Keyboard, Platform } from "react-native";

// Expo status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// System UI configuration for navigation bar theming
import * as SystemUI from 'expo-system-ui';

// Navigation bar configuration for proper theming
import * as NavigationBar from 'expo-navigation-bar';

/**
 * TabLayout Component
 * 
 * Main navigation layout for the authenticated app using Expo Router tabs.
 * Provides bottom tab navigation with dynamic keyboard handling and custom styling.
 * 
 * Features:
 * - 4 main tab screens (explore, search, watchlist, more)
 * - Additional hidden screens accessible via navigation
 * - Keyboard-aware tab bar that hides when keyboard is visible
 * - Dark theme styling with custom colors and spacing
 */
export default function TabLayout() {
  // State to track keyboard visibility for dynamic tab bar behavior
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  /**
   * Keyboard Event Listeners Setup
   * 
   * Manages tab bar visibility based on keyboard state:
   * - Hides tab bar when keyboard appears (better UX for forms)
   * - Shows tab bar when keyboard disappears
   * - Uses platform-specific keyboard events for optimal performance
   */
  useEffect(() => {
    // Configure navigation bar to match app background exactly
    const configureNavigationBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(Colors.dark.background);
        await NavigationBar.setButtonStyleAsync('light');
      } catch (error) {
        console.warn('Failed to configure navigation bar:', error);
      }
    };
    
    configureNavigationBar();

    // Platform-specific keyboard show events
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    
    // Platform-specific keyboard hide events
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    // Cleanup listeners on component unmount
    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#161622" />
      <Tabs
        screenOptions={{
        // Custom tab bar styling with dark theme
        tabBarStyle: {
          backgroundColor: Colors.dark.background, // Dark background color
          borderTopWidth: 0, // Remove default border
          height: 65, // Custom height for better touch targets
          paddingTop: 8, // Top padding for icon spacing
          paddingBottom: 8, // Bottom padding for icon spacing
          position: 'absolute', // Absolute positioning for overlay effect
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0, // Remove shadow on Android
          display: isKeyboardVisible ? 'none' : 'flex', // Hide when keyboard is visible
        },
        tabBarShowLabel: false, // Hide text labels, only show icons
        tabBarActiveTintColor: Colors.dark.buttonBackground, // Active tab color
        tabBarInactiveTintColor: Colors.dark.tabIconDefault, // Inactive tab color
        // Global header styling for screens that show headers
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
      }}
    >
      {/* Explore Tab - Main discovery screen */}
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false, // Hide header for custom layout
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "compass-outline" : "compass-outline"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Readlist Tab - User's saved manga */}
      <Tabs.Screen
        name="readlist"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name="book-outline"
              size={28}
              color={color}
            />
          ),
        }}
      />

      {/* Search Tab - Anime search functionality */}
      <Tabs.Screen
        name="search"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "magnify" : "magnify"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Watchlist Tab - User's saved anime */}
      <Tabs.Screen
        name="watchlist"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "bookmark-outline" : "bookmark-outline"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* More Tab - Settings and additional options */}
      <Tabs.Screen
        name="more"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "menu" : "menu"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Hidden Screen: Top Anime - Accessible via navigation but not in tab bar */}
      <Tabs.Screen
        name="top"
        options={{
          href: null, // Hides from tab bar
          headerShown: true,
          headerTitle: "Top Anime",
        }}
      />
      
      {/* Hidden Screen: Trending - Shows currently trending anime */}
      <Tabs.Screen
        name="trending"
        options={{
          href: null, // Hides from tab bar
          headerShown: true,
          headerTitle: "Trending Now",
        }}
      />

      {/* Hidden Screen: Manga Catalog - Full manga discovery list */}
      <Tabs.Screen
        name="manga"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Popular Manga",
        }}
      />

      {/* Hidden Screen: Manga Details - Individual manga information */}
      <Tabs.Screen
        name="manga-details"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      
      {/* Hidden Screen: Anime Details - Individual anime information */}
      <Tabs.Screen
        name="details"
        options={{
          href: null,
          headerShown: false, // Hide the header completely for custom layout
        }}
      />
      
      {/* Hidden Screen: Watch History - User's viewing history */}
      <Tabs.Screen
        name="history"
        options={{
          href: null, // Hides from tab bar
          headerShown: true,
          headerTitle: "Watch History",
          headerLeft: () => null, // Remove the default back button
        }}
      />

      {/* Hidden Screen: Read History - Manga reading history */}
      <Tabs.Screen
        name="read-history"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Read History",
          headerLeft: () => null,
        }}
      />
    </Tabs>
    </>
  );
}
