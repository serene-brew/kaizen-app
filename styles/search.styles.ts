import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');
const GENRE_BOX_WIDTH = 100; // Fixed width for genre boxes in horizontal scroll

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Increased padding to ensure scrollability to the bottom
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 60, // Space for status bar
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  searchButton: {
    backgroundColor: Colors.dark.buttonBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.dark.secondaryBackground,
    opacity: 0.7,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Genres Header with title and clear filters button
  genresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  // Genres Section - Horizontal Scroll
  genresSection: {
    paddingVertical: 8,
    position: 'relative',
  },
  genresScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: 'row',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '500',
  },
  genreBox: {
    width: GENRE_BOX_WIDTH,
    height: 90,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  genreBoxSelected: {
    backgroundColor: 'rgba(133, 98, 237, 0.15)',
    borderWidth: 1,
    borderColor: Colors.dark.buttonBackground,
  },
  genreText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  genreTextSelected: {
    color: Colors.dark.buttonBackground,
    fontWeight: '700',
  },
  // Recent Searches Section
  recentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40, // Add bottom padding for the last section
  },
  recentList: {
    paddingTop: 4,
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