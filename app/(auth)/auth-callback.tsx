// React Native core components for UI rendering and styling
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

// Safe area wrapper to handle device-specific screen boundaries
import { SafeAreaView } from "react-native-safe-area-context";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Expo status bar component for controlling status bar appearance
import { StatusBar } from "expo-status-bar";

/**
 * AuthCallback Component
 * 
 * An intermediate screen displayed during OAuth authentication callback process.
 * This screen is shown briefly after OAuth provider redirects back to the app
 * while the GlobalProvider processes the authentication token and updates state.
 * 
 * Flow:
 * 1. User completes OAuth on external provider (Google in our case)
 * 2. Provider redirects to this callback screen
 * 3. GlobalProvider detects URL change and processes auth token
 * 4. User is automatically redirected to main app or auth failure screen
 */
// This screen is shown briefly during the OAuth callback process.
// It displays a loader while the GlobalProvider verifies the token
// and updates the authentication state.
const AuthCallback = () => {
  return (
    // Safe area container to avoid notch/status bar overlap
    <SafeAreaView style={styles.container}>
      {/* Main content wrapper with centered layout */}
      <View style={styles.content}>
        {/* Loading spinner with app's primary color */}
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        
        {/* Primary loading message */}
        <Text style={styles.loadingText}>Completing authentication...</Text>
        
        {/* Secondary descriptive text for user reassurance */}
        <Text style={styles.subText}>Please wait while we log you in</Text>
      </View>
      
      {/* Status bar styling to match dark theme */}
      <StatusBar backgroundColor={Colors.dark.background} style="light" />
    </SafeAreaView>
  );
};

/**
 * StyleSheet for AuthCallback component
 * Uses dark theme colors for consistent app appearance
 */
const styles = StyleSheet.create({
  // Main container taking full screen with dark background
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  // Content wrapper with centered alignment and padding
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // Primary loading text styling - larger and bold
  loadingText: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  // Secondary text styling - smaller and muted color
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.dark.secondaryText,
  }
});

export default AuthCallback;
