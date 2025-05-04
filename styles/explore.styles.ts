import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.4;
const CAROUSEL_HEIGHT = width * 0.6;
const CONTENT_PADDING = 16;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  carouselContainer: {
    width: '100%',
    height: CAROUSEL_HEIGHT,
    marginBottom: 20,
  },
  carouselItem: {
    width: width,
    height: CAROUSEL_HEIGHT,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.secondaryText,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Colors.dark.buttonBackground,
  },
  placeholderText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
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
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  moreButtonText: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollContainer: {
    paddingLeft: CONTENT_PADDING,
  },
  scrollContentContainer: {
    paddingRight: CONTENT_PADDING, // Add right padding to the content inside scroll
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  lastCard: {
    marginRight: CONTENT_PADDING, // Extra margin for the last card
  },
  posterPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden', // Add overflow hidden to contain the image
  },
  posterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  watchlistIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingTitle: {
    height: 14,
    width: '80%',
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 4,
  },
  errorContainer: {
    width: CARD_WIDTH * 2,
    height: CARD_WIDTH * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    textAlign: 'center',
  },
});