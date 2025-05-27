import { StyleSheet, Dimensions, Platform } from "react-native";
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
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700',
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dark.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  storageText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginLeft: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  filters: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: Colors.dark.buttonBackground,
  },
  filterText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sortText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom
  },
  downloadItem: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbnailContainer: {
    width: 100,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  downloadInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  downloadTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  episodeInfo: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginTop: 2,
  },
  downloadMeta: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.dark.buttonBackground,
  },
  queueInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  queueInfoText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
});