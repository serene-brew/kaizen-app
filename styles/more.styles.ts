import { StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
  text: {
    color: Colors.dark.text,
    marginBottom: 20,
  },
  logoutButton: {
    width: "80%",
    marginBottom: 20,
    backgroundColor: Colors.dark.tint,
  },
  deleteButton: {
    width: "80%",
    backgroundColor: "#DC3545",
  }
});