import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Alert } from "react-native";
import Colors from "../../constants/Colors";
import { CustomButton, FormField, GoogleButton, Loader } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";
import { styles } from "../../styles/sign-up.styles";

const SignUp = () => {
  const { signUp, signInWithGoogle, loading } = useGlobalContext();

  const [isSubmitting, setSubmitting] = useState(false);
  const [isGoogleSubmitting, setGoogleSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
  });

  const handleGoogleSignUp = async () => {
    if (isGoogleSubmitting) return;
    
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      // Navigation will be handled by the deep link handler in _layout.tsx
    } catch (error) {
      console.error('Google signup error:', error);
      const message = error instanceof Error ? error.message : "Failed to sign up with Google";
      Alert.alert("Authentication Failed", message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const submit = async () => {
    if (!form.email || !form.username) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      // Create account and get OTP information
      const otpData = await signUp(form.email, form.username);
      
      console.log('OTP data received:', JSON.stringify(otpData));
      
      // Navigate to OTP verification page
      router.navigate("/(auth)/verify-otp");
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create account";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Loader isLoading={loading && isGoogleSubmitting} />
      <ScrollView>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Sign Up to Kaizen
          </Text>

          <GoogleButton
            title={isGoogleSubmitting ? "Please wait..." : "Continue with Google"}
            handlePress={handleGoogleSignUp}
            containerStyles={styles.googleButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <FormField
            title="Username"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            otherStyles={styles.fieldSpacing}
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles={styles.fieldSpacing}
            keyboardType="email-address"
          />

          <Text style={styles.infoText}>
            We'll send a verification code to your email to complete signup.
          </Text>

          <CustomButton
            title="Continue with Email"
            handlePress={submit}
            containerStyles={styles.button}
            isLoading={isSubmitting}
          />

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