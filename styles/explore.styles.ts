import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.4;
const CAROUSEL_HEIGHT = width * 0.6;
const CONTENT_PADDING = 16;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 100, // Extra padding at bottom for better scrolling experience
  },
  carouselContainer: {
    height: 250,
    width: width,
    marginBottom: 24,
  },
  carouselLoadingContainer: {
    height: 250,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  carouselItem: {
    width: width,
    height: 230,
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  carouselImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: 230,
  },
  carouselGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    zIndex: 1,
  },
  carouselContent: {
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  carouselInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselGenre: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  carouselDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.secondaryText,
    marginHorizontal: 6,
  },
  carouselRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselRatingText: {
    marginLeft: 4,
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    margin: 4,
  },
  activeDot: {
    backgroundColor: Colors.dark.buttonBackground,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  placeholderText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: CONTENT_PADDING,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 14,
    color: Colors.dark.buttonBackground,
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  scrollContentContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  card: {
    width: 140,
    marginRight: 12,
  },
  lastCard: {
    marginRight: 16, // Add more margin to the last card
  },
  posterPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark.text,
  },
  watchlistIcon: {
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
  },
  loadingTitle: {
    height: 14,
    backgroundColor: Colors.dark.background,
    width: '70%',
    borderRadius: 4,
    marginTop: 8,
  },
  errorContainer: {
    width: width - 32,
    height: 200,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.dark.secondaryText,
    textAlign: 'center',
    padding: 16,
  },
});