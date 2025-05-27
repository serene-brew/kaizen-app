// Expo Router components for navigation structure and routing
import { Stack, router } from "expo-router";

// React hooks for side effects and lifecycle management
import { useEffect } from 'react';

// React Navigation theming for consistent dark mode styling
import { ThemeProvider, DarkTheme } from "@react-navigation/native";

// Status bar component for controlling appearance
import { StatusBar } from 'expo-status-bar';

// Expo splash screen utilities for app initialization
import * as SplashScreen from 'expo-splash-screen';

// React Native core components for user feedback
import { Alert } from 'react-native';

// Expo linking utilities for deep link handling and URL parsing
import * as Linking from 'expo-linking';

// Expo web browser for OAuth authentication flows
import * as WebBrowser from 'expo-web-browser';

// Expo constants for app configuration and environment info
import Constants from 'expo-constants';

// URL polyfill for React Native environment compatibility
import 'react-native-url-polyfill/auto';

// Appwrite client and authentication service initialization
import { client, authService } from '../lib/appwrite';

// Global context provider for user authentication and app state
import GlobalProvider from '../context/GlobalProvider';

// Watchlist context for managing user's saved anime
import { WatchlistProvider } from '../contexts/WatchlistContext';

// Downloads context for managing offline content
import DownloadsProvider from '../contexts/DownloadsContext';

// Watch history context for tracking viewed episodes
import { WatchHistoryProvider } from '../contexts/WatchHistoryContext';

// Authentication synchronization service for data consistency
import { AuthSyncService } from '../context/AuthSyncService';

// Sync manager for coordinating data synchronization across contexts
import SyncManager from '../context/SyncManager';

/**
 * OAuth Session Initialization
 * 
 * Critical setup for handling OAuth callbacks from Appwrite authentication.
 * Ensures proper session completion when users return from external auth providers.
 */
// Initialize web browser for OAuth sessions - critical for handling callbacks from Appwrite
WebBrowser.maybeCompleteAuthSession();

/**
 * Splash Screen Configuration
 * 
 * Prevents automatic hiding of splash screen to allow for proper app initialization.
 * Provides smooth transition from splash to main app content.
 */
// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

/**
 * RootLayout Component
 * 
 * The root component that wraps the entire application with:
 * - Context providers for global state management
 * - Navigation theming and structure
 * - Deep link handling for OAuth and app navigation
 * - Splash screen management and app initialization
 * - Error handling for initialization failures
 */
export default function RootLayout() {
  // Create URL prefix for deep link parsing
  const prefix = Linking.createURL('/');

  /**
   * App Initialization Effect
   * 
   * Handles critical app startup tasks:
   * - Router parameter reset for clean navigation state
   * - Appwrite client initialization
   * - Splash screen management with proper timing
   * - Deep link listener setup and initial URL handling
   * - Error handling with user feedback
   */
  useEffect(() => {
    async function prepare() {
      try {
        // Reset the navigator to ensure we're starting fresh
        router.setParams({});
        
        console.log('Appwrite client initialized in _layout');
        
        // Add artificial delay to improve initial rendering
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Hide splash screen after initialization
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error initializing app:', e);
        Alert.alert(
          'Initialization Error',
          'There was an error initializing the app. Please try again.'
        );
        
        // Hide splash screen even if there's an error
        await SplashScreen.hideAsync().catch(console.warn);
      }
    }

    // Set up deep link handling for the app
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL that might have opened the app
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    prepare();

    // Cleanup subscriptions
    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Deep Link Handler
   * 
   * Processes incoming deep links for:
   * - OAuth authentication callbacks from Appwrite
   * - Direct navigation to specific app screens
   * - Session token handling and validation
   * - Immediate navigation to prevent "not found" flashes
   * 
   * @param url - The incoming deep link URL to process
   */
  // Handle deep links
  const handleDeepLink = ({ url }: { url: string }) => {
    console.log('Deep link detected:', url);
    const { path, queryParams } = Linking.parse(url);
    console.log('Parsed deep link path:', path);
    console.log('Parsed query params:', queryParams);

    // Immediately navigate to auth-callback for any authentication-related paths
    if (path === 'auth/callback' || 
        url.includes('auth/callback') || 
        url.includes('session') || 
        url.includes('token')) {
      console.log('Auth callback deep link detected. Navigating to auth-callback loading screen immediately.');
      
      // Use immediate navigation without setTimeout to prevent "not found" flash
      router.replace('/(auth)/auth-callback');
      
    } else if (path === '(tabs)/explore') {
      // Direct navigation to explore tab
      router.replace('/(tabs)/explore');
    } else if (path === '(auth)/sign-in') {
      // Direct navigation to sign-in screen
      router.replace('/(auth)/sign-in');
    }
    // Add more specific path handling if needed
  };

  /**
   * Context Provider Hierarchy
   * 
   * Establishes the context provider hierarchy for global state management:
   * 1. DownloadsProvider - Manages offline content and download states
   * 2. WatchlistProvider - Manages user's saved anime collection
   * 3. WatchHistoryProvider - Tracks episode viewing history
   * 4. GlobalProvider - Handles user authentication and global app state
   * 5. AuthSyncService & SyncManager - Coordinate data synchronization
   * 
   * Order is important: data contexts first, then auth, then sync services.
   */
  return (
    <DownloadsProvider>
      <WatchlistProvider>
        <WatchHistoryProvider>
          <GlobalProvider>
            {/* Include both sync services for redundancy */}
            <AuthSyncService />
            <SyncManager />
            <ThemeProvider value={DarkTheme}>
              <StatusBar style="light" />
              {/* Root navigation stack with dark theme configuration */}
              <Stack
                screenOptions={{
                  headerShown: false, // Hide headers by default for custom navigation
                  headerStyle: {
                    backgroundColor: '#000000', // Dark header background
                  },
                  headerTintColor: '#FFFFFF', // White header text
                  contentStyle: {
                    backgroundColor: '#000000', // Dark screen background
                  },
                }}
              />
            </ThemeProvider>
          </GlobalProvider>
        </WatchHistoryProvider>
      </WatchlistProvider>
    </DownloadsProvider>
  );
}
