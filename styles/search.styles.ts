import { StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 60,
  },
  recentContainer: {
    flex: 1,
    paddingTop: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recentTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '500',
  },
  recentList: {
    paddingHorizontal: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  recentItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    marginRight: 12,
  },
  recentText: {
    color: Colors.dark.text,
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
});