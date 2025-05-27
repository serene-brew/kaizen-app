import { StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centerContent: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.secondaryBackground,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.secondaryBackground,
    gap: 4,
  },
  headerButtonText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  listContent: {
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.dark.text,
    fontSize: 16,
  },
  emptyText: {
    marginTop: 16,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    color: Colors.dark.secondaryText,
    fontSize: 14,
    textAlign: 'center',
  },
  animeGroup: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  animeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.dark.secondaryBackground,
  },
  animeThumbnail: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  animeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  animeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
    marginBottom: 2,
  },
  lastWatched: {
    fontSize: 12,
    color: Colors.dark.secondaryText,
  },
  episodesList: {
    paddingVertical: 8,
  },
  episodeItem: {
    width: width * 0.7,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  episodeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  audioBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.dark.background,
  },
  audioType: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.dark.buttonBackground,
  },
  removeButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    height: 4,
    backgroundColor: Colors.dark.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.dark.buttonBackground,
    borderRadius: 2,
  },
  episodeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  watchDate: {
    fontSize: 10,
    color: Colors.dark.secondaryText,
  },
  centerButtonSpacer: {
    width: 150,
  },
});