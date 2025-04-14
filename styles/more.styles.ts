import { StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  accountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  sectionTitle: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    color: Colors.dark.text,
    fontSize: 16,
    flex: 1,
  },
  menuValue: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
  },
  dangerText: {
    color: '#DC3545',
  },
  versionText: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
});