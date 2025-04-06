import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from "../../constants/Colors";
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export default function TabLayout() {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.dark.background,
          borderTopWidth: 0,
          height: 65,
          paddingTop: 8,
          paddingBottom: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          display: isKeyboardVisible ? 'none' : 'flex',
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.dark.buttonBackground,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "compass" : "compass-outline"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "magnify" : "magnify"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "bookmark" : "bookmark-outline"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? "menu" : "menu"} 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          href: null, // Hides from tab bar
          headerShown: true,
          headerTitle: "New Releases",
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          href: null, // Hides from tab bar
          headerShown: true,
          headerTitle: "Trending Now",
        }}
      />
      <Tabs.Screen
        name="details"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Details",
        }}
      />
    </Tabs>
  );
}
