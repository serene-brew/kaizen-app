import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Alert } from "react-native";
import Colors from "../../constants/Colors";
import { CustomButton, FormField, GoogleButton, Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { styles } from "../../styles/sign-up.styles";

/**
 * SignUp Component
 * 
 * Provides user registration interface with two methods:
 * 1. Google OAuth authentication (one-click sign up)
 * 2. Email/username-based registration (requires verification)
 * 
 * Features:
 * - Dual registration methods
 * - Form validation for required fields
 * - Loading states for better UX
 * - Automatic navigation to OTP verification
 */
const SignUp = () => {
  // Extract authentication methods and loading state from global context
  const { signUp, signInWithGoogle, loading } = useGlobalContext();

  // Local state for managing form submission and loading states
  const [isSubmitting, setSubmitting] = useState(false); // Email form submission state
  const [isGoogleSubmitting, setGoogleSubmitting] = useState(false); // Google OAuth submission state
  
  // Form data state containing user registration information
  const [form, setForm] = useState({
    username: "", // User's chosen username
    email: "",    // User's email address for verification
  });

  /**
   * Handles Google OAuth sign-up process
   * Prevents duplicate submissions and manages loading state
   * Shows appropriate error messages if registration fails
   */
  const handleGoogleSignUp = async () => {
    // Prevent duplicate submissions during loading
    if (isGoogleSubmitting) return;
    
    setGoogleSubmitting(true);
    try {
      // Initiate Google OAuth flow for registration
      await signInWithGoogle();
      // Navigation will be handled by the deep link handler in _layout.tsx
    } catch (error) {
      // Log error for debugging
      console.error('Google signup error:', error);
      
      // Extract meaningful error message for user display
      const message = error instanceof Error ? error.message : "Failed to sign up with Google";
      Alert.alert("Authentication Failed", message);
    } finally {
      // Reset loading state regardless of success/failure
      setGoogleSubmitting(false);
    }
  };

  /**
   * Handles email/username-based registration process
   * Validates form fields and creates account with verification
   * Navigates to OTP verification screen on success
   */
  const submit = async () => {
    // Validate that all required fields are filled
    if (!form.email || !form.username) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      // Create account and get OTP information
      const otpData = await signUp(form.email, form.username);
      
      // Log OTP data for debugging purposes
      console.log('OTP data received:', JSON.stringify(otpData));
      
      // Navigate to OTP verification page
      router.navigate("/(auth)/verify-otp");
      
    } catch (error) {
      // Extract and display error message
      const message = error instanceof Error ? error.message : "Failed to create account";
      Alert.alert("Error", message);
    } finally {
      // Reset submission state
      setSubmitting(false);
    }
  };

  return (
    // Safe area container to avoid notch/status bar overlap
    <SafeAreaView style={styles.container}>
      {/* Loading overlay specifically for Google sign-up process */}
      <Loader isLoading={loading && isGoogleSubmitting} />
      
      {/* Scrollable content for smaller screens */}
      <ScrollView>
        <View style={styles.contentContainer}>
          {/* Main heading */}
          <Text style={styles.title}>
            Sign Up to Kaizen
          </Text>

          {/* Google OAuth sign-up button */}
          <GoogleButton
            title={isGoogleSubmitting ? "Please wait..." : "Continue with Google"}
            handlePress={handleGoogleSignUp}
            containerStyles={styles.googleButton}
          />

          {/* Visual divider between registration methods */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Username input field */}
          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            otherStyles={styles.fieldSpacing}
          />

          {/* Email input field */}
          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles={styles.fieldSpacing}
            keyboardType="email-address"
          />

          {/* Informational text about email verification */}
          <Text style={styles.infoText}>
            We'll send a verification code to your email to complete signup.
          </Text>

          {/* Email sign-up submit button */}
          <CustomButton
            title="Continue with Email"
            handlePress={submit}
            containerStyles={styles.button}
            isLoading={isSubmitting}
          />

          {/* Footer with sign-in link for existing users */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Have an account already?
            </Text>
            <Link href="/sign-in" style={styles.footerLink}>
              Login
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;