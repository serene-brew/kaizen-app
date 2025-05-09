import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.35;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  
  // Header section with poster and main info
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    marginTop: 10, // Add top margin for status bar space
  },
  posterContainer: {
    width: POSTER_WIDTH,
    position: 'relative', // For positioning the watchlist button
  },
  poster: {
    width: '100%',
    height: POSTER_WIDTH * 1.5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  watchlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 0,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  
  // Rating badge (star design)
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  
  // Info badges (TV, PG-13, etc)
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Sub/Dub toggle
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
  
  // Description section with expand/collapse
  descriptionContainer: {
    padding: 16,
    paddingTop: 16, // Increased from 8 to 16 to add more space
    marginTop: 8, // Added extra margin at the top
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  description: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  
  // Genres section
  genresContainer: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  genreChip: {
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  genreChipText: {
    color: Colors.dark.text,
    fontSize: 13,
  },
  
  // Episodes section
  episodesSection: {
    padding: 16,
    paddingBottom: 80,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
});