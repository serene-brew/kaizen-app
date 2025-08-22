// React hooks for state management and side effects
import { useEffect, useState } from "react";

// Safe area wrapper to handle device-specific screen boundaries
import { SafeAreaView } from "react-native-safe-area-context";

// React Native core components for UI rendering
import { View, Text, TouchableOpacity } from "react-native";

// Expo Router for navigation
import { router } from "expo-router";

// Custom components for buttons and OTP input
import { CustomButton } from "../../components";
import { showErrorAlert, showSuccessAlert } from "../../components/CustomAlert";

// Application color constants for consistent theming
import Colors from "../../constants/Colors";

// Global context for OTP verification state and methods
import { useGlobalContext } from "../../context/GlobalProvider";

// Material Community Icons for visual elements
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Custom OTP input component
import OTPInput from "../../components/OTPInput";

// Component-specific styles
import { styles } from "../../styles/verify-otp.styles";

/**
 * VerifyOTP Component
 * 
 * Handles email verification through OTP (One-Time Password) process:
 * - Displays OTP input field for 6-digit code
 * - Manages countdown timer for OTP expiration
 * - Provides resend functionality with cooldown period
 * - Validates OTP info and handles error states
 * - Automatically redirects to main app on successful verification
 */
const VerifyOTP = () => {
  // Extract OTP-related methods and state from global context
  const { otpInfo, verifyOTP, sendOTP, loading } = useGlobalContext();
  
  // Local state for OTP verification process
  const [otp, setOtp] = useState(""); // User's entered OTP code
  const [timeLeft, setTimeLeft] = useState(600); // Countdown timer in seconds (10 minutes)
  const [isResending, setIsResending] = useState(false); // Resend button loading state
  const [hasValidInfo, setHasValidInfo] = useState(false); // Whether we have valid OTP info

  /**
   * Effect to initialize timer and validate OTP information
   * Calculates remaining time based on expiration timestamp
   * Sets up countdown timer that updates every second
   */
  useEffect(() => {
    // Check if we have valid OTP info, but don't immediately redirect
    if (!otpInfo?.email) {
      setHasValidInfo(false);
      return;
    }
    
    setHasValidInfo(true);

    // Calculate time left based on expiry time
    const now = new Date();
    const expiresAt = new Date(otpInfo.expiresAt);
    const diff = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    
    // Check if OTP has already expired
    if (diff <= 0) {
      // OTP expired
      showErrorAlert("OTP Expired", "Please request a new verification code.");
      return;
    }
    
    setTimeLeft(diff);
    
    // Start the countdown timer that updates every second
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    // Clean up timer on component unmount or dependency change
    return () => clearInterval(timer);
  }, [otpInfo]); // Depend on otpInfo object

  /**
   * Formats seconds into MM:SS display format
   * @param seconds - Time remaining in seconds
   * @returns Formatted time string (e.g., "09:45")
   */
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handles OTP verification process
   * Validates input length and attempts verification
   * Redirects to main app on success or shows error
   */
  const handleVerify = async () => {
    // Validate OTP length (must be 6 digits)
    if (otp.length !== 6) {
      showErrorAlert("Error", "Please enter a valid 6-digit verification code");
      return;
    }

    try {
      // Verify the entered OTP code
      await verifyOTP(otp);
      // Navigate to main app on successful verification
      router.replace("/(tabs)/explore");
    } catch (error) {
      // Display verification error to user
      const message = error instanceof Error ? error.message : "Invalid verification code";
      showErrorAlert("Verification Failed", message);
    }
  };

  /**
   * Handles resending a new OTP code
   * Requires valid email and manages resend loading state
   * Resets timer and clears current input on success
   */
  const handleResend = async () => {
    // Only need email to resend
    if (!otpInfo?.email) {
      showErrorAlert("Error", "Cannot resend OTP without email information.");
      return;
    }
    
    setIsResending(true);
    try {
      // Send new OTP to the email
      await sendOTP(otpInfo.email);
      showSuccessAlert("Code Sent", "A new verification code has been sent to your email.");
      setOtp(""); // Clear current input
      setHasValidInfo(true); // Now we should have valid info
      // Timer will reset automatically due to useEffect dependency on otpInfo
    } catch (error) {
      // Display resend error to user
      const message = error instanceof Error 
        ? error.message 
        : "Failed to send a new verification code";
      showErrorAlert("Error", message);
    } finally {
      // Reset resending state
      setIsResending(false);
    }
  };
  
  /**
   * Navigates back to sign-up screen
   * Used when OTP info is invalid or user wants to restart process
   */
  const handleBackToSignUp = () => {
    router.replace("/(auth)/sign-up");
  };

  /**
   * Error State Render
   * Displayed when OTP information is missing or invalid
   * Provides options to return to sign-up or request new code
   */
  // If we don't have valid OTP info, show a message
  if (!hasValidInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Email alert icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name="email-alert" 
              size={60} 
              color={Colors.dark.buttonBackground} 
            />
          </View>
          
          {/* Error state heading */}
          <Text style={styles.title}>Verification Required</Text>
          
          {/* Error state description */}
          <Text style={styles.subtitle}>
            We couldn't find your verification information.{'\n'}
            Please try signing up again or request a new code.
          </Text>

          {/* Button to return to sign-up */}
          <CustomButton
            title="Back to Sign Up"
            handlePress={handleBackToSignUp}
            containerStyles={styles.button}
          />
          
          {/* Conditional resend button if email exists */}
          {otpInfo?.email && (
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResend}
              disabled={isResending}
            >
              <Text style={styles.resendText}>
                {isResending ? "Sending..." : "Request New Code"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Main OTP Verification Render
   * Displays OTP input, timer, and verification controls
   * Shown when valid OTP information is available
   */
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Email check icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name="email-check" 
            size={60} 
            color={Colors.dark.buttonBackground} 
          />
        </View>
        
        {/* Main heading */}
        <Text style={styles.title}>Email Verification</Text>
        
        {/* Instruction text with email address */}
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.emailText}>{otpInfo?.email || 'your email'}</Text>
        </Text>

        {/* OTP input component container */}
        <View style={styles.otpContainer}>
          <OTPInput length={6} value={otp} onChange={setOtp} />
        </View>

        {/* Timer display with clock icon */}
        <View style={styles.timerContainer}>
          <MaterialCommunityIcons 
            name="clock-outline" 
            size={18} 
            color={timeLeft < 60 ? Colors.dark.buttonBackground : Colors.dark.secondaryText} 
          />
          <Text style={[
            styles.timerText, 
            timeLeft < 60 && styles.timerWarning
          ]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        {/* Verify button */}
        <CustomButton
          title="Verify"
          handlePress={handleVerify}
          containerStyles={styles.button}
          isLoading={loading}
        />

        {/* Footer with resend option */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Didn't receive code?</Text>
          <TouchableOpacity 
            onPress={handleResend} 
            disabled={isResending || timeLeft > 540} // Allow resend after 1 minute
          >
            <Text style={[
              styles.resendText, 
              (isResending || timeLeft > 540) && styles.resendDisabled
            ]}>
              Resend
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VerifyOTP;