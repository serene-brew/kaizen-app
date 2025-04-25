import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import Colors from '../constants/Colors';

interface OTPInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean; // Add disabled prop
}

const OTPInput = ({ length, value, onChange, disabled = false }: OTPInputProps) => {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [localValue, setLocalValue] = useState<string[]>(
    Array(length).fill('').map((_, i) => value[i] || '')
  );
  const [isFocused, setIsFocused] = useState<boolean[]>(Array(length).fill(false));

  // Update local state when value prop changes
  useEffect(() => {
    if (value !== localValue.join('')) {
      setLocalValue(Array(length).fill('').map((_, i) => value[i] || ''));
    }
  }, [value, length]);

  const handleChangeText = (text: string, index: number) => {
    // Only accept single digit
    const digit = text.replace(/[^0-9]/g, '').slice(0, 1);
    
    // Update local state
    const newValue = [...localValue];
    newValue[index] = digit;
    setLocalValue(newValue);
    
    // Pass up to parent component
    onChange(newValue.join(''));
    
    // Auto focus next field if we have a digit
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace - move to previous input
    if (e.nativeEvent.key === 'Backspace' && !localValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // If focusing on a filled cell, clear it to allow easy replacement
    if (localValue[index]) {
      const newValue = [...localValue];
      newValue[index] = '';
      setLocalValue(newValue);
      onChange(newValue.join(''));
    }
    // Update focus state
    const newFocusState = Array(length).fill(false);
    newFocusState[index] = true;
    setIsFocused(newFocusState);
  };

  const handleBlur = (index: number) => {
    // Update focus state
    const newFocusState = [...isFocused];
    newFocusState[index] = false;
    setIsFocused(newFocusState);
  };

  const inputs = Array(length).fill(0).map((_, index) => (
    <TextInput
      key={index}
      style={[
        styles.input,
        disabled && styles.inputDisabled // Apply disabled style
      ]}
      maxLength={1}
      keyboardType="numeric"
      value={localValue[index]}
      onChangeText={(text) => handleChangeText(text, index)}
      onKeyPress={(e) => handleKeyPress(e, index)}
      onFocus={() => handleFocus(index)}
      ref={(ref) => {
        inputRefs.current[index] = ref;
      }}
      selectTextOnFocus
      selectionColor={Colors.dark.buttonBackground}
      cursorColor={Colors.dark.buttonBackground}
      editable={!disabled} // Set editable based on disabled prop
    />
  ));

  return (
    <View style={styles.container}>
      {inputs}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  input: {
    width: 45,
    height: 56,
    borderRadius: 8,
    backgroundColor: Colors.dark.inputBackground,
    borderWidth: 2,
    borderColor: Colors.dark.inputBorder,
    textAlign: 'center',
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '600',
  },
  inputDisabled: { // Add style for disabled input
    backgroundColor: Colors.dark.inputBackground, // Use existing background color with opacity
    opacity: 0.5, // Add opacity to indicate disabled state
    color: Colors.dark.text, // Use existing text color
    borderColor: Colors.dark.inputBorder, // Use existing border color
  },
});

export default OTPInput;