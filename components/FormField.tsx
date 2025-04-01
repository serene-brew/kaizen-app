import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

interface FormFieldProps {
  title: string;
  value: string;
  placeholder?: string;
  handleChangeText: (text: string) => void;
  otherStyles?: any;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
}

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  ...props
}: FormFieldProps) => {
  return (
    <View style={[styles.container, otherStyles]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={Colors.dark.placeholderText}
          onChangeText={handleChangeText}
          {...props}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: Colors.dark.inputBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FormField;