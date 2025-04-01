import { ActivityIndicator, Text, TouchableOpacity, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

interface CustomButtonProps {
  title: string;
  handlePress: () => void;
  containerStyles?: any;
  textStyles?: any;
  isLoading?: boolean;
}

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
      activeOpacity={0.7}
      style={[styles.button, containerStyles, isLoading && styles.buttonDisabled]}
      disabled={isLoading}
    >
      <Text style={[styles.buttonText, textStyles]}>{title}</Text>
      {isLoading && <ActivityIndicator color="#fff" style={styles.loader} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.dark.buttonBackground,
    borderRadius: 10, // Reduced from 12
    minHeight: 48, // Reduced from 62
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 16, // Reduced from 18
    fontWeight: '600',
  },
  loader: {
    marginLeft: 8,
  }
});

export default CustomButton;