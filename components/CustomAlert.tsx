// React hooks for state management
import React, { useState, useEffect } from 'react';

// React Native core components
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  StyleSheet,
  BackHandler 
} from 'react-native';

// Material Community Icons for alert icons
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Application color constants
import Colors from '../constants/Colors';

/**
 * Custom Alert Types and Interfaces
 * 
 * Type definitions for the custom alert system to ensure type safety
 * and provide proper autocomplete support for developers.
 */

// Alert type enumeration for different alert styles
export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

// Button configuration interface
export interface AlertButton {
  text: string;                    // Button label text
  style?: 'default' | 'cancel' | 'destructive'; // Button styling
  onPress?: () => void;           // Button press handler
}

// Main alert configuration interface
export interface AlertConfig {
  title: string;                   // Alert title
  message?: string;               // Alert message (optional)
  type?: AlertType;               // Alert type for styling
  buttons?: AlertButton[];        // Array of buttons
  cancelable?: boolean;           // Can be dismissed by tapping outside
  onDismiss?: () => void;         // Callback when alert is dismissed
}

/**
 * Global Alert State Management
 * 
 * Manages the global alert queue and visibility state.
 * Supports multiple alerts in queue with proper animation handling.
 */
let alertQueue: AlertConfig[] = [];
let currentAlert: AlertConfig | null = null;
let alertStateCallback: ((config: AlertConfig | null) => void) | null = null;

/**
 * Alert Icon Mapping
 * 
 * Maps alert types to appropriate MaterialCommunityIcons and colors
 * for consistent visual representation across the app.
 */
const getAlertIcon = (type: AlertType): { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string } => {
  switch (type) {
    case 'success':
      return { name: 'check-circle', color: '#C23B22' }; //#4CAF50
    case 'warning':
      return { name: 'alert-circle', color: '#C23B22' }; //#FF9800
    case 'error':
      return { name: 'close-circle', color: '#C23B22' }; //#F44336
    case 'confirm':
      return { name: 'help-circle', color: Colors.dark.buttonBackground };
    case 'info':
    default:
      return { name: 'information', color: Colors.dark.buttonBackground };
  }
};

/**
 * CustomAlert Component
 * 
 * A beautiful, dark-themed alert component that replaces the default
 * React Native Alert with a custom implementation that matches the app's design.
 * 
 * Features:
 * - Dark theme styling consistent with app design
 * - Smooth animations (fade in/out with scale)
 * - Icon support for different alert types
 * - Multiple button configurations
 * - Dismissible by tapping outside (optional)
 * - Hardware back button support on Android
 * - Queue management for multiple alerts
 */
const CustomAlert: React.FC = () => {
  // Alert visibility and animation state
  const [visible, setVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  
  // Animation values for smooth transitions
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  /**
   * Alert State Management Effect
   * 
   * Registers callback to receive alert state changes from the global queue system.
   * Handles showing and hiding alerts with proper animations.
   */
  useEffect(() => {
    alertStateCallback = (config: AlertConfig | null) => {
      if (config) {
        setAlertConfig(config);
        showAlert();
      } else {
        hideAlert();
      }
    };

    return () => {
      alertStateCallback = null;
    };
  }, []);

  /**
   * Android Hardware Back Button Handler
   * 
   * Prevents hardware back button from closing the alert unless it's cancelable.
   * Provides consistent behavior across platforms.
   */
  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (alertConfig?.cancelable) {
          dismissAlert();
          return true;
        }
        return true; // Prevent back button from closing non-cancelable alerts
      });

      return () => backHandler.remove();
    }
  }, [visible, alertConfig]);

  /**
   * Show Alert Animation
   * 
   * Displays the alert with smooth fade-in and scale animations.
   * Creates a professional, polished user experience.
   */
  const showAlert = () => {
    setVisible(true);
    
    // Reset animation values
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    
    // Animate in with spring effect
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Hide Alert Animation
   * 
   * Hides the alert with smooth fade-out animation and processes
   * the next alert in queue if available.
   */
  const hideAlert = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setAlertConfig(null);
      
      // Process next alert in queue
      processNextAlert();
    });
  };

  /**
   * Alert Dismissal Handler
   * 
   * Handles dismissing the alert with proper callback execution.
   * Calls onDismiss callback if provided.
   */
  const dismissAlert = () => {
    if (alertConfig?.onDismiss) {
      alertConfig.onDismiss();
    }
    hideAlert();
  };

  /**
   * Button Press Handler
   * 
   * Handles button press events with proper callback execution
   * and alert dismissal logic.
   * 
   * @param button - The button configuration that was pressed
   */
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    hideAlert();
  };

  // Don't render anything if no alert config
  if (!alertConfig) {
    return null;
  }

  // Get icon configuration for the alert type
  const iconConfig = getAlertIcon(alertConfig.type || 'info');

  return (
    <Modal
      transparent
      visible={visible}
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => {
        if (alertConfig.cancelable) {
          dismissAlert();
        }
      }}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={() => {
            if (alertConfig.cancelable) {
              dismissAlert();
            }
          }}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [{ scale: scaleAnim }],
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Alert Header with Icon and Title */}
            <View style={styles.header}>
              <MaterialCommunityIcons
                name={iconConfig.name}
                size={28}
                color={iconConfig.color}
                style={styles.icon}
              />
              <Text style={styles.title}>{alertConfig.title}</Text>
            </View>

            {/* Alert Message (if provided) */}
            {alertConfig.message && (
              <Text style={styles.message}>{alertConfig.message}</Text>
            )}

            {/* Alert Buttons */}
            <View style={styles.buttonContainer}>
              {(alertConfig.buttons || [{ text: 'OK', style: 'default' }]).map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    button.style === 'cancel' && styles.cancelButton,
                    button.style === 'destructive' && styles.destructiveButton,
                    alertConfig.buttons?.length === 1 && styles.singleButton,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelButtonText,
                      button.style === 'destructive' && styles.destructiveButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

/**
 * Alert Queue Management
 * 
 * Processes the next alert in the queue when the current alert is dismissed.
 * Ensures smooth transition between multiple alerts.
 */
const processNextAlert = () => {
  if (alertQueue.length > 0) {
    const nextAlert = alertQueue.shift();
    if (nextAlert) {
      currentAlert = nextAlert;
      if (alertStateCallback) {
        alertStateCallback(nextAlert);
      }
    }
  } else {
    currentAlert = null;
  }
};

/**
 * Custom Alert API
 * 
 * Main API function that replaces React Native's Alert.alert.
 * Provides the same interface but with custom dark-themed styling.
 * 
 * @param title - Alert title
 * @param message - Alert message (optional)
 * @param buttons - Array of button configurations
 * @param options - Additional options (cancelable, onDismiss)
 */
export const showCustomAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean; onDismiss?: () => void }
) => {
  const alertConfig: AlertConfig = {
    title,
    message,
    buttons: buttons || [{ text: 'OK', style: 'default' }],
    cancelable: options?.cancelable ?? true,
    onDismiss: options?.onDismiss,
    type: 'info', // Default type
  };

  // Add to queue or show immediately
  if (currentAlert) {
    alertQueue.push(alertConfig);
  } else {
    currentAlert = alertConfig;
    if (alertStateCallback) {
      alertStateCallback(alertConfig);
    }
  }
};

/**
 * Typed Alert Convenience Functions
 * 
 * Pre-configured alert functions for common use cases with appropriate
 * icons and styling for better user experience.
 */
export const showSuccessAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  showCustomAlert(title, message, buttons);
  if (currentAlert) {
    currentAlert.type = 'success';
  }
};

export const showErrorAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  showCustomAlert(title, message, buttons);
  if (currentAlert) {
    currentAlert.type = 'error';
  }
};

export const showWarningAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  showCustomAlert(title, message, buttons);
  if (currentAlert) {
    currentAlert.type = 'warning';
  }
};

export const showConfirmAlert = (
  title: string, 
  message?: string, 
  onConfirm?: () => void, 
  onCancel?: () => void
) => {
  const buttons: AlertButton[] = [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: 'Confirm', style: 'default', onPress: onConfirm },
  ];
  
  showCustomAlert(title, message, buttons);
  if (currentAlert) {
    currentAlert.type = 'confirm';
  }
};

/**
 * Alert Styles
 * 
 * Comprehensive styling for the custom alert component that matches
 * the app's dark theme and provides a professional appearance.
 */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 22, 34, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  alertContainer: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 16,
    marginHorizontal: 24,
    maxWidth: Dimensions.get('window').width - 48,
    minWidth: Dimensions.get('window').width - 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: Colors.dark.secondaryText,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  singleButton: {
    borderTopWidth: 0,
    marginTop: -1,
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: Colors.dark.border,
  },
  destructiveButton: {
    // Destructive buttons don't need special background in dark theme
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark.buttonBackground,
  },
  cancelButtonText: {
    color: Colors.dark.secondaryText,
  },
  destructiveButtonText: {
    color: '#FF6B6B',
  },
});

export default CustomAlert;
