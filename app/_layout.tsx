// filepath: /home/risersama/projects/kaizen-app/app/_layout.tsx
import { Stack, router } from "expo-router";
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';
import { client, authService } from '../lib/appwrite';
import GlobalProvider from '../context/GlobalProvider';
import { WatchlistProvider } from '../contexts/WatchlistContext';
import DownloadsProvider from '../contexts/DownloadsContext';
import { WatchHistoryProvider } from '../contexts/WatchHistoryContext';

// Initialize web browser for OAuth sessions - critical for handling callbacks from Appwrite
WebBrowser.maybeCompleteAuthSession();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
  const prefix = Linking.createURL('/');

  useEffect(() => {
    async function prepare() {
      try {
        // Reset the navigator to ensure we're starting fresh
        router.setParams({});
        
        console.log('Appwrite client initialized in _layout');
        
        // Add artificial delay to show splash screen
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        console.warn('Error initializing app:', e);
        Alert.alert(
          'Initialization Error',
          'There was an error initializing the app. Please try again.'
        );
      } finally {
        // Hide the splash screen
        await SplashScreen.hideAsync();
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
      router.replace('/(tabs)/explore');
    } else if (path === '(auth)/sign-in') {
      router.replace('/(auth)/sign-in');
    }
    // Add more specific path handling if needed
  };

  return (
    <DownloadsProvider>
      <WatchlistProvider>
        <WatchHistoryProvider>
          <GlobalProvider>
            <ThemeProvider value={DarkTheme}>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  headerStyle: {
                    backgroundColor: '#000000',
                  },
                  headerTintColor: '#FFFFFF',
                  contentStyle: {
                    backgroundColor: '#000000',
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
