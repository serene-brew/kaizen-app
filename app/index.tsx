import { Text, View } from "react-native";
import Colors from "../constants/Colors";

export default function Index() {
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
        NYAAA...
      </Text>
    </View>
  );
}
