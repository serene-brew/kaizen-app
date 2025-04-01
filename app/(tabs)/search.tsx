import { Text, View, StyleSheet } from "react-native";
import Colors from "../../constants/Colors";

export default function Search() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
  text: {
    color: Colors.dark.text,
  },
});
