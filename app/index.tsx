import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomButton, Loader } from "../components";
import Colors from "../constants/Colors";
import { useGlobalContext } from "../context/GlobalProvider";

/**
 * Welcome Component
 * 
 * The app's landing page that serves as the entry point for new users.
 * Features:
 * - Authentication state detection with automatic redirection
 * - Loading state management during app initialization
 * - Welcome message and app branding
 * - Navigation to sign-in and sign-up flows
 * - Responsive design with scrollable content
 * - Dark theme styling consistent with app design
 * 
 * Flow Logic:
 * 1. Shows loading spinner during authentication check
 * 2. Redirects authenticated users to main app (explore tab)
 * 3. Displays welcome screen for unauthenticated users
 * 4. Provides entry points to authentication flows
 */
const Welcome = () => {
  // Extract authentication state from global context
  const { loading, isLogged, user } = useGlobalContext();
  
  /**
   * Loading State Render
   * 
   * Displays loading spinner while the app initializes and checks
   * for existing user sessions. Prevents premature content display.
   */
  if (loading) {
    return <Loader isLoading={true} />;
  }
  
  /**
   * Authenticated User Redirect
   * 
   * Automatically redirects authenticated users to the main app experience.
   * Skips the welcome screen for users who are already logged in.
   * Navigates to the explore tab as the default landing page.
   */
  if (isLogged && user) {
    return <Redirect href="/(tabs)/explore" />;
  }
  
  /**
   * Welcome Screen Render
   * 
   * Main welcome interface for unauthenticated users featuring:
   * - App branding with splash screen icon
   * - Compelling value proposition messaging
   * - Clear call-to-action buttons for authentication
   * - Scrollable layout for smaller screens
   * - Professional dark theme design
   */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.content}>
          {/* App branding and visual identity */}
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={styles.image}
            resizeMode="contain"
          />
          
          {/* Main value proposition heading */}
          <View style={styles.textContainer}>
            <Text style={styles.heading}>
              Watch anime{"\n"}
              in peace{" "}
            </Text>
          </View>
          
          {/* Supporting value proposition and benefits */}
          <Text style={styles.subtitle}>
            For Absolutely Free{"\n"}No Ads, No Limits
          </Text>
          
          {/* Primary authentication action - Sign In */}
          <CustomButton
            title="Sign In"
            handlePress={() => router.push("/(auth)/sign-in")}
            containerStyles={styles.buttonContainer}
          />
          
          {/* Secondary authentication action - Sign Up */}
          <CustomButton
            title="Sign Up"
            handlePress={() => router.push("/(auth)/sign-up")}
            containerStyles={styles.buttonContainer}
          />
        </View>
      </ScrollView>
      
      {/* Status bar configuration for dark theme */}
      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

/**
 * Component Styling
 * 
 * Comprehensive styles for the welcome screen that provide:
 * - Consistent dark theme color scheme
 * - Responsive layout that adapts to screen sizes
 * - Proper spacing and typography hierarchy
 * - Professional appearance with centered content
 * - Accessible touch targets for navigation buttons
 */
const styles = StyleSheet.create({
  // Main container with full screen coverage
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  
  // Scrollable content area
  scrollView: {
    height: '100%',
  },
  
  // Centered content layout
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  
  // Legacy title style (currently unused)
  title: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Accent color highlight for special text
  highlight: {
    color: Colors.dark.tint,
  },
  
  // App logo/icon styling
  image: {
    maxWidth: 380,
    width: '100%',
    height: 298,
  },
  
  // Container for heading text
  textContainer: {
    marginTop: 20,
  },
  
  // Main heading typography
  heading: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Subtitle and value proposition styling
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 28,
    textAlign: 'center',
  },
  
  // Legacy button style (currently unused)
  button: {
    width: '100%',
    marginTop: 28,
  },
  
  // Button container with proper spacing
  buttonContainer: {
    width: '100%',
    marginTop: 28,
  },
});

export default Welcome;