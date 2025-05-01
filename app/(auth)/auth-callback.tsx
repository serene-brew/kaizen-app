import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { StatusBar } from "expo-status-bar";

// This screen is shown briefly during the OAuth callback process.
// It displays a loader while the GlobalProvider verifies the token
// and updates the authentication state.
const AuthCallback = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={styles.loadingText}>Completing authentication...</Text>
        <Text style={styles.subText}>Please wait while we log you in</Text>
      </View>
      <StatusBar backgroundColor={Colors.dark.background} style="light" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.dark.text,
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.dark.secondaryText,
  }
});

export default AuthCallback;
