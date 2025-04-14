import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.4;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  posterContainer: {
    width: POSTER_WIDTH,
  },
  poster: {
    width: '100%',
    height: POSTER_WIDTH * 1.5,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  summary: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.dark.buttonBackground,
  },
  buttonInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  buttonText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  buttonTextInactive: {
    color: Colors.dark.secondaryText,
  },
  audioButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.border,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  watchlistButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchlistActive: {
    backgroundColor: Colors.dark.buttonBackground,
    borderColor: Colors.dark.buttonBackground,
  },
  actionButtonText: {
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  watchlistActiveText: {
    color: Colors.dark.text,
  },
  reviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  reviewButtonText: {
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  episodesSection: {
    padding: 16,
    paddingBottom: 70,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  episodeBox: {
    width: 48,
    height: 48,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeNumber: {
    color: Colors.dark.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});