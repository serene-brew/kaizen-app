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
    alignItems: 'center',
    paddingHorizontal: 24,
    minHeight: Dimensions.get("window").height - 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(194, 59, 34, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.secondaryText,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emailText: {
    color: Colors.dark.text,
    fontWeight: '500',
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  timerWarning: {
    color: Colors.dark.buttonBackground,
  },
  button: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginRight: 8,
  },
  resendText: {
    color: Colors.dark.buttonBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  resendDisabled: {
    opacity: 0.5,
  },
  resendButton: {
    marginTop: 16,
    padding: 8,
  },
});