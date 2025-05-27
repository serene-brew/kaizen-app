// Core Expo Router imports for navigation and routing
import { Redirect, Stack, router, usePathname } from "expo-router";

// Expo status bar component for controlling status bar appearance
import { StatusBar } from "expo-status-bar";

// Custom components
import { Loader } from "../../components";

// Global context for authentication state management
import { useGlobalContext } from "../../context/GlobalProvider";

// React hook for side effects
import { useEffect } from "react"; // Import useEffect

/**
 * AuthLayout Component
 *
 * A layout wrapper for authentication screens that:
 * - Manages automatic redirection for logged-in users
 * - Displays loading states during authentication
 * - Provides consistent styling and navigation structure for auth flow
 * - Prevents authenticated users from accessing auth screens
 */
const AuthLayout = () => {
  // Extract authentication state from global context
  const { loading, isLogged } = useGlobalContext();

  // Get current pathname for debugging and route tracking
  const pathname = usePathname(); // Get current path using the hook

  // Debug logging (commented out for production)
  // console.log(`AuthLayout Render: path=${pathname}, loading=${loading}, isLogged=${isLogged}`);

  /**
   * Authentication Redirect Effect
   *
   * Automatically redirects authenticated users away from auth screens
   * Uses useEffect to handle redirection after component state updates
   * Prevents users from manually navigating back to auth screens when logged in
   */
  // Use useEffect to handle redirection after state update
  useEffect(() => {
    // Debug logging (commented out for production)
    // console.log(`AuthLayout useEffect: path=${pathname}, loading=${loading}, isLogged=${isLogged}`);

    // Only redirect when loading is complete and user is authenticated
    // If loading is finished and the user is logged in, redirect away from auth screens
    if (!loading && isLogged) {
      // Debug logging (commented out for production)
      // console.log("AuthLayout useEffect: User is logged in, redirecting to /(tabs)/explore...");

      // Use router.replace to prevent users from navigating back to auth screens
      // Use replace to prevent going back to the auth screen
      router.replace("/(tabs)/explore");
    }
    // Dependency note: Only depends on loading and isLogged states
    // No need to check the current path here, if isLogged is true, we always want to redirect away from AuthLayout
  }, [loading, isLogged]); // Depend only on loading and isLogged

  /**
   * Early Return for Authenticated Users
   *
   * Prevents rendering of auth screens when user is already logged in
   * Returns null to avoid flash of auth content before redirect completes
   */
  // If loading is finished and user is logged in, render nothing (or Redirect) while useEffect triggers navigation
  if (!loading && isLogged) {
    // Debug logging (commented out for production)
    //  console.log("AuthLayout: Rendering null while redirecting...");
    return null; // Or <Redirect href="/(tabs)/explore" />; useEffect should handle it
  }

  /**
   * Main Auth Layout Render
   *
   * Renders the authentication layout containing:
   * - Stack navigator for auth screens without headers
   * - Loading indicator during authentication processes
   * - Consistent status bar styling
   */
  // If loading or not logged in, render the auth stack
  return (
    <>
      {/* Stack navigator configuration for auth screens */}
      {/* Hides headers to provide clean auth experience */}
      <Stack screenOptions={{ headerShown: false }} />

      {/* Loading overlay component */}
      {/* Shows spinner/loading indicator when authentication is in progress */}
      {/* Show loader only when loading is true */}
      <Loader isLoading={loading} />

      {/* Status bar styling for consistent dark theme */}
      {/* Dark background (#161622) with light text content */}
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default AuthLayout;