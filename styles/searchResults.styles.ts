import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.dark.text,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    height: 150,
  },
  thumbnailContainer: {
    width: 100,
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  rightContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.border,
  },
  bookmarkButton: {
    marginBottom: 16,
  },
  badge: {
    backgroundColor: Colors.dark.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.dark.text,
  },
  scoreContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 34, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    width: 42,
  },
  scoreText: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.dark.secondaryText,
    textAlign: 'center',
  },
});