// React hooks for state management
import { useState } from "react";

// React Native core components for form input UI
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";

// Material Community Icons for password visibility toggle
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Application color constants for consistent theming
import Colors from "../constants/Colors";

/**
 * FormField Component Props Interface
 * 
 * Defines the contract for the reusable form input component with:
 * - Required title, value, and change handler
 * - Optional placeholder text and styling customization
 * - Keyboard type specification for different input types
 * - Secure text entry support for password fields
 */
interface FormFieldProps {
  title: string;                    // Field label displayed above input
  value: string;                    // Current input value (controlled component)
  placeholder?: string;             // Optional placeholder text
  handleChangeText: (text: string) => void; // Text change event handler
  otherStyles?: any;                // Optional container style overrides
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad"; // Input keyboard type
  secureTextEntry?: boolean;        // Enable password masking functionality
}

/**
 * FormField Component
 * 
 * A reusable form input component that provides:
 * - Consistent styling across all forms in the application
 * - Label and input field with proper spacing and typography
 * - Password visibility toggle for secure text entry fields
 * - Customizable keyboard types for different input scenarios
 * - Dark theme integration with proper contrast ratios
 * - Flexible styling through optional prop overrides
 * - Accessible design with proper color contrast and touch targets
 * 
 * Used throughout authentication forms, settings, and user input screens.
 */
const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  secureTextEntry,
  ...props // Spread operator to pass additional TextInput props
}: FormFieldProps) => {
  // Local state for password visibility toggle
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  /**
   * Password Visibility Toggle Handler
   * 
   * Toggles the visibility state of password fields, allowing users
   * to temporarily view their password input for verification.
   * Only applicable when secureTextEntry prop is true.
   */
  const togglePasswordVisibility = () => {
    setPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, otherStyles]}>
      {/* Field label with consistent typography */}
      <Text style={styles.title}>{title}</Text>
      
      {/* Input container with border and background styling */}
      <View style={styles.inputContainer}>
        {/* Main text input with controlled value and styling */}
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.placeholderText}
          onChangeText={handleChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible} // Conditional password masking
          {...props} // Pass through additional TextInput properties
        />
        
        {/* Password visibility toggle button - only shown for secure fields */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? "eye-off" : "eye"} // Dynamic icon based on visibility state
              size={24}
              color={Colors.dark.secondaryText}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * Component Styles
 * 
 * Defines the visual appearance of the form field component:
 * - Consistent spacing with gap-based layout
 * - Proper label typography and contrast
 * - Input container with border, background, and padding
 * - Responsive design with flexible input area
 * - Accessible touch targets for password toggle
 * - Dark theme color integration throughout
 */
const styles = StyleSheet.create({
  // Main container with consistent spacing
  container: {
    gap: 8, // Modern gap property for consistent spacing between label and input
  },
  
  // Field label styling with proper hierarchy
  title: {
    fontSize: 14,               // Readable label size
    color: Colors.dark.text,    // High contrast text color
    fontWeight: '500',          // Medium weight for emphasis
  },
  
  // Input container with background and border styling
  inputContainer: {
    width: '100%',                              // Full width container
    height: 52,                                 // Fixed height for consistent form appearance
    paddingHorizontal: 16,                      // Comfortable horizontal padding
    backgroundColor: Colors.dark.inputBackground, // Subtle background differentiation
    borderRadius: 12,                           // Rounded corners for modern appearance
    borderWidth: 2,                             // Visible border for field definition
    borderColor: Colors.dark.inputBorder,       // Subtle border color
    flexDirection: 'row',                       // Horizontal layout for input and icon
    alignItems: 'center',                       // Vertical centering
    justifyContent: 'space-between',            // Space distribution for input and icon
  },
  
  // Text input styling with flexible width
  input: {
    flex: 1,                    // Take available space, leaving room for icon
    color: Colors.dark.text,    // High contrast text color
    fontSize: 14,               // Readable input text size
    fontWeight: '500',          // Medium weight for clarity
  },
  
  // Password toggle icon container
  eyeIcon: {
    padding: 1, // Minimal padding for precise touch target
  },
});

export default FormField;