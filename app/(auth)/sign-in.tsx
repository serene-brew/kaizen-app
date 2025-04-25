import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, StyleSheet } from "react-native";
import Colors from "../../constants/Colors";
import { CustomButton, FormField, GoogleButton } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

const SignIn = () => {
  const { signIn, signInWithGoogle } = useGlobalContext();
  const [isSubmitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert("Error", "Failed to sign in with Google");
    }
  };

  const submit = async () => {
    if (email === "") {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

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
            title="Continue with Google"
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
            isLoading={isSubmitting}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  contentContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 24,
    minHeight: Dimensions.get("window").height - 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.dark.text,
    marginTop: 40,
  },
  googleButton: {
    marginTop: 40,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    color: Colors.dark.secondaryText,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  fieldSpacing: {
    marginTop: 28,
  },
  button: {
    marginTop: 28,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 18,
    color: Colors.dark.secondaryText,
  },
  footerLink: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.buttonBackground,
  },
  infoText: {
    marginTop: 16,
    color: Colors.dark.secondaryText,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SignIn;