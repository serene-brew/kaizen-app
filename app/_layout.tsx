import { Stack } from "expo-router";
import { useEffect } from 'react';
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

// Keep splash screen visible while app is loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    async function prepare() {
      try {
        // Add any pre-loading steps here
        await new Promise(resolve => setTimeout(resolve, 100)); // Minimum display time
      } catch (e) {
        console.warn(e);
      } finally {
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
