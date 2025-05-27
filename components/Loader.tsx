// React Native core components for UI rendering and device interaction
import { View, ActivityIndicator, Dimensions, Platform, StyleSheet } from "react-native";

/**
 * Loader Component Props Interface
 * 
 * Simple interface for controlling the visibility of the loading overlay.
 * The boolean flag determines whether the loader should be displayed.
 */
interface LoaderProps {
  isLoading: boolean; // Controls visibility of the loading overlay
}

/**
 * Loader Component
 * 
 * A full-screen loading overlay component that provides:
 * - Cross-platform loading spinner with appropriate sizing
 * - Semi-transparent backdrop that prevents user interaction
 * - Full viewport coverage with absolute positioning
 * - Conditional rendering based on loading state
 * - Consistent dark theme integration
 * - High z-index to appear above all other content
 * 
 * Used throughout the app for:
 * - API request loading states
 * - Authentication processes
 * - Screen transitions
 * - File upload/download operations
 * - Any async operation requiring user feedback
 */
const Loader = ({ isLoading }: LoaderProps) => {
  // Platform detection for cross-platform spinner sizing
  const osName = Platform.OS;
  
  // Dynamic screen height for full coverage across different devices
  const screenHeight = Dimensions.get("screen").height;

  // Early return pattern - don't render anything if not loading
  if (!isLoading) return null;

  return (
    <View style={[styles.container, { height: screenHeight }]}>
      {/* Cross-platform activity indicator with platform-specific sizing */}
      <ActivityIndicator
        animating={isLoading}
        color="#fff" // White spinner for visibility on dark backdrop
        size={osName === "ios" ? "large" : 50} // iOS uses preset sizes, Android accepts numbers
      />
    </View>
  );
};

/**
 * Component Styles
 * 
 * Defines the full-screen overlay appearance:
 * - Absolute positioning to cover entire screen
 * - Semi-transparent dark background that blocks interaction
 * - Centered spinner with high z-index layering
 * - Full width and dynamic height for complete coverage
 */
const styles = StyleSheet.create({
  // Full-screen overlay container
  container: {
    position: 'absolute',           // Overlay positioning above all content
    flex: 1,                        // Fill available space
    justifyContent: 'center',       // Center spinner vertically
    alignItems: 'center',           // Center spinner horizontally
    width: '100%',                  // Full screen width
    backgroundColor: 'rgba(22, 22, 34, 0.6)', // Semi-transparent dark backdrop matching app theme
    zIndex: 10,                     // High z-index to appear above other components
  }
});

export default Loader;
