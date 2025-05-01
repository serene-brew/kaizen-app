import { Text, View, ActivityIndicator } from "react-native";
import { usePathname } from "expo-router";
import Colors from "../constants/Colors";
import { useEffect, useState } from "react";

export default function NotFound() {
  const pathname = usePathname();
  const [isAuthRedirect, setIsAuthRedirect] = useState(false);
  
  useEffect(() => {
    // Check if this is likely an auth redirect by examining the URL
    // This could happen during the brief period after returning from OAuth
    if (pathname && (
      pathname.includes('auth/callback') || 
      pathname.includes('session') || 
      pathname.includes('token') ||
      pathname.includes('oauth')
    )) {
      setIsAuthRedirect(true);
    }
  }, [pathname]);

  // If this looks like an auth redirect, show a loading screen instead of "not found"
  if (isAuthRedirect) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.dark.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.dark.buttonBackground} />
        <Text style={{ color: Colors.dark.text, marginTop: 20 }}>
          Completing authentication...
        </Text>
      </View>
    );
  }

  // Standard not found screen
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.dark.background,
      }}
    >
      <Text style={{ color: Colors.dark.text }}>
        This page doesn't exist.
      </Text>
    </View>
  );
}
