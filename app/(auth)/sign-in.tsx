import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Alert } from "react-native";
import Colors from "../../constants/Colors";
import { CustomButton, FormField, GoogleButton, Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { styles } from "../../styles/sign-in.styles";

const SignIn = () => {
  const { signIn, signInWithGoogle, loading } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [isGoogleSubmitting, setGoogleSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const handleGoogleSignIn = async () => {
    if (isGoogleSubmitting || loading) return;

    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      // Navigation will be handled by the deep link handler in _layout.tsx
    } catch (error) {
      console.error('Google signin error:', error);
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google';
      Alert.alert("Authentication Failed", message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const submit = async () => {
    if (email === "") {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    if (loading) return;

    setSubmitting(true);
    try {
      await signIn(email);
      // Navigate to OTP verification after sending the code
      router.navigate("/(auth)/verify-otp");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Log in to Kaizen
          </Text>

          <GoogleButton
            title={isGoogleSubmitting ? "Please wait..." : "Continue with Google"}
            handlePress={handleGoogleSignIn}
            containerStyles={styles.googleButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            otherStyles={styles.fieldSpacing}
            keyboardType="email-address"
          />

          <Text style={styles.infoText}>
            We'll send a verification code to your email to log you in securely.
          </Text>

          <CustomButton
            title="Continue with Email"
            handlePress={submit}
            containerStyles={styles.button}
            isLoading={loading || isSubmitting}
          />

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
      <Loader isLoading={isGoogleSubmitting && loading} />
    </SafeAreaView>
  );
};

export default SignIn;