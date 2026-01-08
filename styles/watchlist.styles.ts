import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
// Use the same responsive card dimensions as trending and top pages
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    padding: PADDING,
    paddingTop: 55,
    paddingBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  sortButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    backgroundColor: Colors.dark.secondaryBackground,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.secondaryBackground,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PADDING,
    paddingBottom: 80, // Increased padding to ensure content isn't hidden by tab bar
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Maintain space-between for proper 2-column layout
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: GAP + 4, // Slightly increased margin for better spacing
  },
  posterPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.5, // Same aspect ratio as trending and top pages
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden', // Ensure image doesn't overflow rounded corners
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(22, 22, 34, 0.7)',
    borderRadius: 20,
    padding: 4,
  },
  notSyncedIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(22, 22, 34, 0.7)',
    borderRadius: 20,
    padding: 4,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PADDING,
    paddingBottom: 80, // Ensure content isn't hidden behind tab bar
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PADDING,
    paddingBottom: 80, // Ensure content isn't hidden behind tab bar
  },
  emptyText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  syncHintText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  exploreButton: {
    backgroundColor: Colors.dark.buttonBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // New loading container styles
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PADDING,
    paddingBottom: 80, // Ensure content isn't hidden behind tab bar
  },
  loadingText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 16,
  },
});