import { useState } from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, Dimensions, Alert, StyleSheet } from "react-native";
import Colors from "../../constants/Colors";
import { CustomButton, FormField } from "../../components";
import { useGlobalContext } from "../../context/GlobalProvider";

const SignUp = () => {
  const { setUser, setIsLogged } = useGlobalContext();

  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    if (form.username === "" || form.email === "" || form.password === "") {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      // Simulate user creation logic
      const result = { username: form.username, email: form.email };
      setUser(result);
      setIsLogged(true);
      router.replace("/(tabs)/explore");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Sign Up to Kaizen
          </Text>

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

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles={styles.fieldSpacing}
            secureTextEntry
          />

          <CustomButton
            title="Sign Up"
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
});

export default SignUp;