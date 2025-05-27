// React hooks for state management, refs, and lifecycle
import React, { useState, useRef, useEffect } from 'react';

// React Native core components for input UI
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';

// Application color constants for consistent theming
import Colors from '../constants/Colors';

/**
 * OTPInput Component Props Interface
 * 
 * Defines the contract for the one-time password input component with:
 * - Configurable length for different OTP formats
 * - Controlled component pattern with value and change handler
 * - Optional disabled state for pending operations
 */
interface OTPInputProps {
  length: number;           // Number of OTP digits (typically 4-6)
  value: string;            // Current OTP value (controlled component)
  onChange: (value: string) => void; // Change handler for parent component
  disabled?: boolean;       // Optional disabled state for validation/submission
}

/**
 * OTPInput Component
 * 
 * A sophisticated one-time password input component that provides:
 * - Individual input fields for each digit with auto-focus progression
 * - Smart navigation: auto-advance on digit entry, backspace to previous field
 * - Input validation: numeric-only with single digit per field
 * - Enhanced UX: clear-on-focus for easy digit replacement
 * - Accessibility: proper keyboard type and text selection
 * - Visual feedback: focus states and disabled styling
 * - Cross-platform: consistent behavior on iOS and Android
 * 
 * Used for:
 * - Email verification during registration
 * - Two-factor authentication
 * - Password reset confirmation
 * - Any secure verification process requiring OTP codes
 */
const OTPInput = ({ length, value, onChange, disabled = false }: OTPInputProps) => {
  // Refs array to manage focus between individual input fields
  const inputRefs = useRef<Array<TextInput | null>>([]);
  
  // Local state to manage individual digit values independently
  const [localValue, setLocalValue] = useState<string[]>(
    Array(length).fill('').map((_, i) => value[i] || '')
  );
  
  // Focus state tracking for visual feedback (currently unused but available for styling)
  const [isFocused, setIsFocused] = useState<boolean[]>(Array(length).fill(false));

  /**
   * Prop Value Synchronization Effect
   * 
   * Ensures local state stays synchronized with parent component's value prop.
   * Handles cases where parent component updates the OTP value externally
   * (e.g., clearing the form, setting a default value, or validation errors).
   */
  // Update local state when value prop changes
  useEffect(() => {
    if (value !== localValue.join('')) {
      setLocalValue(Array(length).fill('').map((_, i) => value[i] || ''));
    }
  }, [value, length]);

  /**
   * Digit Input Handler
   * 
   * Handles text input with intelligent behavior:
   * - Filters input to numeric characters only
   * - Limits to single digit per field
   * - Updates both local state and notifies parent
   * - Auto-advances to next field when digit is entered
   * - Maintains cursor position and field focus
   * 
   * @param text - Raw input text from TextInput
   * @param index - Index of the current input field
   */
  const handleChangeText = (text: string, index: number) => {
    // Only accept single digit - filter out non-numeric and limit length
    const digit = text.replace(/[^0-9]/g, '').slice(0, 1);
    
    // Update local state with new digit
    const newValue = [...localValue];
    newValue[index] = digit;
    setLocalValue(newValue);
    
    // Immediately notify parent component of the change
    onChange(newValue.join(''));
    
    // Auto focus next field if we have a digit and not at the end
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Backspace Navigation Handler
   * 
   * Provides intuitive backspace behavior:
   * - If current field is empty and backspace is pressed, move to previous field
   * - Allows users to easily correct mistakes by navigating backwards
   * - Maintains expected keyboard navigation patterns
   * 
   * @param e - Keyboard event containing the pressed key
   * @param index - Index of the current input field
   */
  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace - move to previous input if current is empty
    if (e.nativeEvent.key === 'Backspace' && !localValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Focus Handler with Clear-on-Focus UX
   * 
   * Enhances user experience by:
   * - Clearing the focused field if it already contains a digit
   * - Allowing easy replacement of existing digits without manual deletion
   * - Updating focus state for potential visual styling
   * - Providing immediate feedback for the active field
   * 
   * @param index - Index of the focused input field
   */
  const handleFocus = (index: number) => {
    // If focusing on a filled cell, clear it to allow easy replacement
    if (localValue[index]) {
      const newValue = [...localValue];
      newValue[index] = '';
      setLocalValue(newValue);
      onChange(newValue.join(''));
    }
    // Update focus state for potential styling purposes
    const newFocusState = Array(length).fill(false);
    newFocusState[index] = true;
    setIsFocused(newFocusState);
  };

  /**
   * Blur Handler
   * 
   * Updates focus state when field loses focus.
   * Maintains accurate focus tracking for styling and UX purposes.
   * 
   * @param index - Index of the input field that lost focus
   */
  const handleBlur = (index: number) => {
    // Update focus state when field loses focus
    const newFocusState = [...isFocused];
    newFocusState[index] = false;
    setIsFocused(newFocusState);
  };

  /**
   * Input Field Generation
   * 
   * Dynamically creates the specified number of input fields with:
   * - Individual refs for programmatic focus control
   * - Consistent styling with theme integration
   * - Proper keyboard configuration for numeric input
   * - Accessibility features like text selection
   * - Disabled state support for form validation
   */
  const inputs = Array(length).fill(0).map((_, index) => (
    <TextInput
      key={index}
      style={[
        styles.input,
        disabled && styles.inputDisabled // Apply disabled styling when component is disabled
      ]}
      maxLength={1}                    // Enforce single character limit
      keyboardType="numeric"           // Show numeric keyboard on mobile
      value={localValue[index]}        // Controlled component with individual digit value
      onChangeText={(text) => handleChangeText(text, index)}
      onKeyPress={(e) => handleKeyPress(e, index)}
      onFocus={() => handleFocus(index)}
      onBlur={() => handleBlur(index)}
      ref={(ref) => {
        inputRefs.current[index] = ref; // Store ref for programmatic focus control
      }}
      selectTextOnFocus               // Auto-select text when field gains focus
      selectionColor={Colors.dark.buttonBackground}   // Cursor selection color
      cursorColor={Colors.dark.buttonBackground}      // Text cursor color
      editable={!disabled}            // Disable editing when component is disabled
    />
  ));

  return (
    <View style={styles.container}>
      {inputs}
    </View>
  );
};

/**
 * Component Styles
 * 
 * Defines the visual appearance of the OTP input fields:
 * - Equal spacing between fields for visual balance
 * - Square input fields with rounded corners for modern appearance
 * - Large, centered text for easy reading and accessibility
 * - Consistent dark theme integration with app colors
 * - Disabled state styling for form validation feedback
 */
const styles = StyleSheet.create({
  // Container for horizontal layout of input fields
  container: {
    flexDirection: 'row',      // Horizontal arrangement of input fields
    justifyContent: 'space-between', // Equal spacing between fields
    width: '100%',             // Full width for optimal spacing
  },
  
  // Individual input field styling
  input: {
    width: 45,                                    // Fixed width for consistent appearance
    height: 56,                                   // Adequate height for touch targets
    borderRadius: 8,                              // Subtle rounded corners
    backgroundColor: Colors.dark.inputBackground, // Consistent with app's input styling
    borderWidth: 2,                               // Visible border for field definition
    borderColor: Colors.dark.inputBorder,         // Subtle border color
    textAlign: 'center',                          // Center the digit horizontally
    color: Colors.dark.text,                      // High contrast text color
    fontSize: 24,                                 // Large, readable font size
    fontWeight: '600',                            // Semi-bold for digit emphasis
  },
  
  // Disabled state styling for visual feedback
  inputDisabled: {
    backgroundColor: Colors.dark.inputBackground, // Maintain background consistency
    opacity: 0.5,                                // Reduced opacity to indicate disabled state
    color: Colors.dark.text,                     // Maintain text color for readability
    borderColor: Colors.dark.inputBorder,        // Consistent border color
  },
});

export default OTPInput;