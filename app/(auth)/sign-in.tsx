import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView } from "react-native";
import Colors from "../../constants/Colors";
import { CustomButton, FormField, GoogleButton, Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { showErrorAlert } from "../../components/CustomAlert";
import { styles } from "../../styles/sign-in.styles";

/**
 * SignIn Component
 * 
 * Provides user authentication interface with two methods:
 * 1. Google OAuth authentication (one-click sign in)
 * 2. Email-based authentication (sends verification code)
 * 
 * Features:
 * - Dual authentication methods
 * - Form validation and error handling
 * - Loading states for better UX
 * - Automatic navigation after successful authentication
 */
const SignIn = () => {
  // Extract authentication methods and loading state from global context
  const { signIn, signInWithGoogle, loading } = useGlobalContext();
  
  // Local state for managing form submission and loading states
  const [isSubmitting, setSubmitting] = useState(false); // Email form submission state
  const [isGoogleSubmitting, setGoogleSubmitting] = useState(false); // Google OAuth submission state
  const [email, setEmail] = useState(""); // User's email input

  /**
   * Handles Google OAuth sign-in process
   * Prevents duplicate submissions and manages loading state
   * Shows appropriate error messages if authentication fails
   */
  const handleGoogleSignIn = async () => {
    // Prevent duplicate submissions during loading
    if (isGoogleSubmitting || loading) return;

    setGoogleSubmitting(true);
    try {
      // Initiate Google OAuth flow
      await signInWithGoogle();
      // Navigation will be handled by the deep link handler in _layout.tsx
    } catch (error) {
      // Log error for debugging
      console.error('Google signin error:', error);
      
      // Extract meaningful error message for user display
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google';
      showErrorAlert("Authentication Failed", message);
    } finally {
      // Reset loading state regardless of success/failure
      setGoogleSubmitting(false);
    }
  };

  /**
   * Handles email-based sign-in process
   * Validates email input and sends verification code
   * Navigates to OTP verification screen on success
   */
  const submit = async () => {
    // Validate email input
    if (email === "") {
      showErrorAlert("Error", "Please enter your email address");
      return;
    }
    
    // Prevent submission during existing operations
    if (loading) return;

    setSubmitting(true);
    try {
      // Send verification code to user's email
      await signIn(email);
      
      // Navigate to OTP verification after sending the code
      router.navigate("/(auth)/verify-otp");
    } catch (error) {
      // Extract and display error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      showErrorAlert("Error", errorMessage);
    } finally {
      // Reset submission state
      setSubmitting(false);
    }
  };

  return (
    // Safe area container to avoid notch/status bar overlap
    <SafeAreaView style={styles.container}>
      {/* Scrollable content for smaller screens */}
      <ScrollView>
        <View style={styles.contentContainer}>
          {/* Main heading */}
          <Text style={styles.title}>
            Log in to Kaizen
          </Text>

          {/* Google OAuth sign-in button */}
          <GoogleButton
            title={isGoogleSubmitting ? "Please wait..." : "Continue with Google"}
            handlePress={handleGoogleSignIn}
            containerStyles={styles.googleButton}
          />

          {/* Visual divider between authentication methods */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email input field */}
          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            otherStyles={styles.fieldSpacing}
            keyboardType="email-address"
          />

          {/* Informational text about email verification */}
          <Text style={styles.infoText}>
            We'll send a verification code to your email to log you in securely.
          </Text>

          {/* Email sign-in submit button */}
          <CustomButton
            title="Continue with Email"
            handlePress={submit}
            containerStyles={styles.button}
            isLoading={loading || isSubmitting}
          />

          {/* Footer with sign-up link for new users */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?
            </Text>
            <Link
              href="/sign-up"
              style={styles.footerLink}
            >
              Signup
            </Link>
          </View>
        </View>
      </ScrollView>
      
      {/* Loading overlay specifically for Google sign-in process */}
      <Loader isLoading={isGoogleSubmitting && loading} />
    </SafeAreaView>
  );
};

export default SignIn;