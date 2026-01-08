// React Native core components for search input UI
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";

// Material Community Icons for search and clear functionality
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Application color constants for consistent theming
import Colors from "../constants/Colors";

/**
 * SearchBar Component Props Interface
 * 
 * Defines the contract for the search input component with:
 * - Controlled component pattern for search query state
 * - Text change handler for real-time search updates
 * - Submit handler for explicit search execution
 */
interface SearchBarProps {
  value: string;                    // Current search query (controlled component)
  onChangeText: (text: string) => void; // Handler for text input changes
  onSubmit: () => void;            // Handler for search submission (Enter key)
  placeholder?: string;            // Optional placeholder text
}

/**
 * SearchBar Component
 * 
 * A sophisticated search input component that provides:
 * - Real-time search query input with immediate feedback
 * - Dynamic icon switching: magnify (empty) → clear (with text)
 * - One-tap clear functionality for quick query reset
 * - Keyboard optimization with search return key type
 * - Submit-on-enter behavior for desktop-like experience
 * - Consistent dark theme styling with app design
 * - Accessible touch targets and visual feedback
 * 
 * Used for:
 * - Anime search functionality on search tab
 * - Filtering content within lists and collections
 * - Quick access to content discovery features
 * - User-driven content exploration interface
 */
const SearchBar = ({ value, onChangeText, onSubmit, placeholder = "Search anime..." }: SearchBarProps) => {
  return (
    <View style={styles.inputContainer}>
      {/* Main search input with keyboard optimization */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.secondaryText}
        returnKeyType="search"       // Shows "Search" button on keyboard
        onSubmitEditing={onSubmit}   // Trigger search when user presses enter/search
      />
      
      {/* Dynamic icon: clear button when text exists, search icon when empty */}
      {value.length > 0 ? (
        <TouchableOpacity 
          onPress={() => onChangeText("")} // Clear search query
          style={styles.iconButton}
        >
          <MaterialCommunityIcons 
            name="close-circle" 
            size={20} 
            color={Colors.dark.secondaryText}
          />
        </TouchableOpacity>
      ) : (
        <MaterialCommunityIcons 
          name="magnify" 
          size={24} 
          color={Colors.dark.secondaryText}
        />
      )}
    </View>
  );
};

/**
 * Component Styles
 * 
 * Defines the visual appearance of the search bar:
 * - Compact height with comfortable padding for mobile use
 * - Secondary background color to distinguish from main content
 * - Rounded corners for modern, approachable appearance
 * - Horizontal layout with flexible input and fixed icon area
 * - Proper spacing between input text and interactive elements
 */
const styles = StyleSheet.create({
  // Search bar container with background and layout
  inputContainer: {
    height: 48,                                      // Compact but touch-friendly height
    backgroundColor: Colors.dark.inputBackground,    // Input-specific background for better visibility
    borderRadius: 12,                                // Rounded corners for modern look
    flexDirection: 'row',                            // Horizontal layout for input + icon
    alignItems: 'center',                            // Vertical centering of content
    paddingHorizontal: 12,                           // Comfortable horizontal padding
  },
  
  // Text input with flexible width and proper spacing
  input: {
    flex: 1,                      // Take available space, leaving room for icon
    color: Colors.dark.text,      // High contrast text color for readability
    fontSize: 16,                 // Comfortable reading size for search queries
    marginRight: 8,               // Space between input text and icon
  },
  
  // Interactive icon button with adequate touch target
  iconButton: {
    padding: 4,                   // Expand touch target beyond icon bounds
  },
});

export default SearchBar;