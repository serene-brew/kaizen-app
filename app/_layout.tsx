import { Stack } from "expo-router";
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import 'react-native-url-polyfill/auto';
import { client } from '../lib/appwrite';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Initialize Appwrite
        client.setPlatform('react-native');
        // Add artificial delay to show splash screen
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Hide the splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
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
  );
}
