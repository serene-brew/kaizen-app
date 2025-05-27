// filepath: /home/risersama/projects/kaizen-app/components/GoogleButton.tsx

// React Native core components for interactive UI elements
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Ant Design icons for Google branding
import { AntDesign } from '@expo/vector-icons';

// Application color constants for consistent theming
import Colors from '../constants/Colors';

/**
 * GoogleButton Component Props Interface
 * 
 * Defines the contract for the Google OAuth authentication button with:
 * - Required title text and press handler for OAuth flow
 * - Optional style customization for different contexts
 */
interface GoogleButtonProps {
  title: string;              // Button text (e.g., "Sign in with Google")
  handlePress: () => void;    // OAuth authentication handler
  containerStyles?: any;      // Optional container style overrides
}

/**
 * GoogleButton Component
 * 
 * A specialized button component for Google OAuth authentication that provides:
 * - Official Google branding with recognizable icon and white background
 * - Consistent styling that follows Google's design guidelines
 * - Accessible touch feedback with subtle opacity changes
 * - Flexible text content for different authentication contexts
 * - Professional appearance that builds user trust
 * - Integration with app's authentication flow
 * 
 * Used specifically for Google OAuth sign-in and sign-up flows
 * to provide users with a familiar and trustworthy authentication option.
 */
const GoogleButton = ({ title, handlePress, containerStyles }: GoogleButtonProps) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7} // Subtle opacity change for touch feedback
      style={[styles.button, containerStyles]}
    >
      {/* Content container for icon and text layout */}
      <View style={styles.content}>
        {/* Google icon using official branding colors */}
        <AntDesign name="google" size={20} color="#000" style={styles.icon} />
        
        {/* Button text with Google-style typography */}
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Component Styles
 * 
 * Defines the visual appearance following Google's design guidelines:
 * - White background with subtle border for professional appearance
 * - Proper spacing and typography that matches Google's branding
 * - Adequate touch target size for accessibility
 * - Icon and text layout with proper spacing
 * - Dark text for high contrast on white background
 */
const styles = StyleSheet.create({
  // Main button container with Google-style white background
  button: {
    backgroundColor: '#ffffff',        // Clean white background per Google guidelines
    borderRadius: 10,                  // Subtle rounded corners
    minHeight: 48,                     // Adequate touch target size
    justifyContent: 'center',          // Center content vertically
    alignItems: 'center',              // Center content horizontally
    borderWidth: 1,                    // Subtle border for definition
    borderColor: 'rgba(0, 0, 0, 0.1)', // Light border that doesn't compete with content
  },
  
  // Content layout container for icon and text
  content: {
    flexDirection: 'row',     // Horizontal layout for icon + text
    alignItems: 'center',     // Vertical alignment
    justifyContent: 'center', // Horizontal centering
  },
  
  // Google icon styling with proper spacing
  icon: {
    marginRight: 12, // Space between icon and text
  },
  
  // Text styling with Google-appropriate typography
  text: {
    color: '#000000',  // High contrast black text on white background
    fontSize: 16,      // Readable font size
    fontWeight: '600', // Semi-bold for emphasis and brand consistency
  },
});

export default GoogleButton;
