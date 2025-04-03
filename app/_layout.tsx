import { Stack, router } from "expo-router";
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Alert } from 'react-native';
import 'react-native-url-polyfill/auto';
import { client } from '../lib/appwrite';
import GlobalProvider from '../context/GlobalProvider';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
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

    prepare();
  }, []);

  return (
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
  );
}
