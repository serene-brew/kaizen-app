// React Native core components for UI rendering and device interaction
import { Text, View, ActivityIndicator } from "react-native";

// Expo Router hook for accessing current pathname
import { usePathname } from "expo-router";

// Application color constants for consistent theming
import Colors from "../constants/Colors";

// React hooks for state management and side effects
import { useEffect, useState } from "react";

/**
 * NotFound Component
 * 
 * Custom 404 error page that intelligently handles different scenarios:
 * - Detects OAuth authentication redirects and shows loading state
 * - Prevents confusing "not found" messages during auth flows
 * - Provides user-friendly error messaging for actual 404 errors
 * - Maintains consistent dark theme styling throughout
 * 
 * This component is crucial for smooth OAuth authentication experiences,
 * as users briefly navigate through authentication callback URLs that
 * might not have immediate route matches.
 */
export default function NotFound() {
  // Get current pathname to analyze the route that wasn't found
  const pathname = usePathname();
  
  // Local state to track if this appears to be an authentication redirect
  const [isAuthRedirect, setIsAuthRedirect] = useState(false);
  
  /**
   * Authentication Redirect Detection Effect
   * 
   * Analyzes the current pathname to determine if the "not found" state
   * is actually due to an OAuth authentication callback in progress.
   * 
   * Common authentication URL patterns include:
   * - auth/callback - Standard OAuth callback route
   * - session - Session establishment URLs
   * - token - Token exchange URLs  
   * - oauth - General OAuth flow URLs
   * 
   * When detected, shows loading state instead of error message.
   */
  useEffect(() => {
    // Check if this is likely an auth redirect by examining the URL
    // This could happen during the brief period after returning from OAuth
    if (pathname && (
      pathname.includes('auth/callback') || 
      pathname.includes('session') || 
      pathname.includes('token') ||
      pathname.includes('oauth')
    )) {
      setIsAuthRedirect(true);
    }
  }, [pathname]);

  /**
   * Authentication Loading State Render
   * 
   * Displays a loading spinner and message when the not-found route
   * appears to be related to OAuth authentication flows.
   * Prevents user confusion during callback processing.
   */
  // If this looks like an auth redirect, show a loading screen instead of "not found"
  if (isAuthRedirect) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.dark.background,
        }}
      >
        {/* Loading spinner for authentication processing */}
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        {/* User-friendly message explaining the wait */}
        <Text style={{ color: Colors.dark.text, marginTop: 20 }}>
          Completing authentication...
        </Text>
      </View>
    );
  }

  /**
   * Standard 404 Error State Render
   * 
   * Displays the standard "page not found" message for genuine 404 errors.
   * Uses consistent dark theme styling and clear messaging.
   */
  // Standard not found screen
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.dark.background,
      }}
    >
      {/* Simple, clear error message for actual 404 cases */}
      <Text style={{ color: Colors.dark.text }}>
        This page doesn't exist.
      </Text>
    </View>
  );
}
