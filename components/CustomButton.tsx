// React Native core components for interactive UI elements
import { ActivityIndicator, Text, TouchableOpacity, StyleSheet } from "react-native";

// Application color constants for consistent theming
import Colors from "../constants/Colors";

/**
 * CustomButton Component Props Interface
 * 
 * Defines the contract for the reusable button component with:
 * - Required title text and press handler
 * - Optional style customization for container and text
 * - Loading state support for async operations
 */
interface CustomButtonProps {
  title: string;              // Button text content
  handlePress: () => void;    // Click/tap event handler
  containerStyles?: any;      // Optional container style overrides
  textStyles?: any;           // Optional text style overrides
  isLoading?: boolean;        // Loading state for async operations
}

/**
 * CustomButton Component
 * 
 * A reusable button component that provides:
 * - Consistent styling across the application
 * - Loading state with spinner and disabled interaction
 * - Customizable appearance through style props
 * - Accessible touch feedback with opacity changes
 * - Flexible text content and event handling
 * - Dark theme integration with app color scheme
 * 
 * Used throughout the app for primary actions like sign-in, 
 * sign-up, navigation, and form submissions.
 */
const CustomButton = ({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
}: CustomButtonProps) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7} // Subtle opacity change on press for visual feedback
      style={[
        styles.button, 
        containerStyles, 
        isLoading && styles.buttonDisabled // Apply disabled styling when loading
      ]}
      disabled={isLoading} // Prevent interaction during async operations
    >
      {/* Button text with customizable styling */}
      <Text style={[styles.buttonText, textStyles]}>{title}</Text>
      
      {/* Loading spinner displayed alongside text when isLoading is true */}
      {isLoading && <ActivityIndicator color="#fff" style={styles.loader} />}
    </TouchableOpacity>
  );
};

/**
 * Component Styles
 * 
 * Defines the visual appearance of the button component:
 * - Modern rounded corners with subtle border radius
 * - Adequate touch target size for accessibility
 * - Consistent spacing and typography
 * - Dark theme color integration
 * - Loading state visual feedback
 */
const styles = StyleSheet.create({
  // Main button container styling
  button: {
    backgroundColor: Colors.dark.buttonBackground, // Primary brand color background
    borderRadius: 10, // Reduced from 12 for subtler corners
    minHeight: 48, // Reduced from 62 for more compact appearance
    flexDirection: 'row', // Horizontal layout for text and loading spinner
    justifyContent: 'center', // Center content horizontally
    alignItems: 'center', // Center content vertically
  },
  
  // Disabled state styling for loading operations
  buttonDisabled: {
    opacity: 0.5, // Reduced opacity to indicate disabled state
  },
  
  // Button text styling with proper contrast and readability
  buttonText: {
    color: Colors.dark.text, // High contrast text color
    fontSize: 16, // Reduced from 18 for better proportion
    fontWeight: '600', // Semi-bold for emphasis and readability
  },
  
  // Loading spinner positioning and spacing
  loader: {
    marginLeft: 8, // Space between text and spinner
  }
});

export default CustomButton;