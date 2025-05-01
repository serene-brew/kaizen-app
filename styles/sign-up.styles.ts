import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

export const styles = StyleSheet.create({
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
  googleButton: {
    marginTop: 40,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    color: Colors.dark.secondaryText,
    paddingHorizontal: 16,
    fontSize: 14,
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
  infoText: {
    marginTop: 16,
    color: Colors.dark.secondaryText,
    fontSize: 14,
    textAlign: 'center',
  },
});