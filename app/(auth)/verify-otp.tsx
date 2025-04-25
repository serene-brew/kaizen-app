import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Alert, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { CustomButton } from "../../components";
import Colors from "../../constants/Colors";
import { useGlobalContext } from "../../context/GlobalProvider";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import OTPInput from "../../components/OTPInput";
import { styles } from "../../styles/verify-otp.styles";

const VerifyOTP = () => {
  const { otpInfo, verifyOTP, sendOTP, loading } = useGlobalContext();
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const [hasValidInfo, setHasValidInfo] = useState(false);

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
    
    if (diff <= 0) {
      // OTP expired
      Alert.alert("OTP Expired", "Please request a new verification code.");
      return;
    }
    
    setTimeLeft(diff);
    
    // Start the countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    // Clean up
    return () => clearInterval(timer);
  }, [otpInfo]); // Depend on otpInfo object

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit verification code");
      return;
    }

    try {
      await verifyOTP(otp);
      router.replace("/(tabs)/explore");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid verification code";
      Alert.alert("Verification Failed", message);
    }
  };

  const handleResend = async () => {
    // Only need email to resend
    if (!otpInfo?.email) {
      Alert.alert("Error", "Cannot resend OTP without email information.");
      return;
    }
    
    setIsResending(true);
    try {
      await sendOTP(otpInfo.email);
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      setOtp(""); // Clear current input
      setHasValidInfo(true); // Now we should have valid info
      // Timer will reset automatically due to useEffect dependency on otpInfo
    } catch (error) {
      const message = error instanceof Error 
        ? error.message 
        : "Failed to send a new verification code";
      Alert.alert("Error", message);
    } finally {
      setIsResending(false);
    }
  };
  
  const handleBackToSignUp = () => {
    router.replace("/(auth)/sign-up");
  };

  // If we don't have valid OTP info, show a message
  if (!hasValidInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name="email-alert" 
              size={60} 
              color={Colors.dark.buttonBackground} 
            />
          </View>
          
          <Text style={styles.title}>Verification Required</Text>
          
          <Text style={styles.subtitle}>
            We couldn't find your verification information.{'\n'}
            Please try signing up again or request a new code.
          </Text>

          <CustomButton
            title="Back to Sign Up"
            handlePress={handleBackToSignUp}
            containerStyles={styles.button}
          />
          
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name="email-check" 
            size={60} 
            color={Colors.dark.buttonBackground} 
          />
        </View>
        
        <Text style={styles.title}>Email Verification</Text>
        
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.emailText}>{otpInfo?.email || 'your email'}</Text>
        </Text>

        <View style={styles.otpContainer}>
          <OTPInput length={6} value={otp} onChange={setOtp} />
        </View>

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

        <CustomButton
          title="Verify"
          handlePress={handleVerify}
          containerStyles={styles.button}
          isLoading={loading}
        />

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