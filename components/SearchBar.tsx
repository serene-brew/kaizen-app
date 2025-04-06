import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../constants/Colors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

const SearchBar = ({ value, onChangeText, onSubmit }: SearchBarProps) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search anime..."
        placeholderTextColor={Colors.dark.secondaryText}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value.length > 0 ? (
        <TouchableOpacity 
          onPress={() => onChangeText("")}
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

const styles = StyleSheet.create({
  inputContainer: {
    height: 48,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
    marginRight: 8,
  },
  iconButton: {
    padding: 4,
  },
});

export default SearchBar;