import { Text, View } from "react-native";
import Colors from "../constants/Colors";

export default function NotFound() {
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
