import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomButton, Loader } from "../components";
import Colors from "../constants/Colors";
import { useGlobalContext } from "../context/GlobalProvider";

const Welcome = () => {
  const { loading, isLogged, user } = useGlobalContext();
  
  if (loading) {
    return <Loader isLoading={true} />;
  }
  
  if (isLogged && user) {
    return <Redirect href="/(tabs)/explore" />;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.content}>
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={styles.image}
            resizeMode="contain"
          />
          <View style={styles.textContainer}>
            <Text style={styles.heading}>
              Watch anime{"\n"}
              in peace{" "}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            For Absolutely Free{"\n"}No Ads, No Limits
          </Text>
          <CustomButton
            title="Sign In"
            handlePress={() => router.push("/(auth)/sign-in")}
            containerStyles={styles.buttonContainer}
          />
          <CustomButton
            title="Sign Up"
            handlePress={() => router.push("/(auth)/sign-up")}
            containerStyles={styles.buttonContainer}
          />
        </View>
      </ScrollView>
      <StatusBar backgroundColor="#161622" style="light" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    height: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  highlight: {
    color: Colors.dark.tint,
  },
  image: {
    maxWidth: 380,
    width: '100%',
    height: 298,
  },
  textContainer: {
    marginTop: 20,
  },
  heading: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 28,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    marginTop: 28,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 28,
  },
});

export default Welcome;