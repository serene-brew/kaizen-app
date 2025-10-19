import { StyleSheet, Dimensions, Platform } from "react-native";
import Colors from "../constants/Colors";

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  fullscreenContainer: {
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.dark.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerTitle: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  episodeCounter: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.text,
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.dark.text,
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.dark.buttonBackground,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  thumbnailContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.dark.secondaryText,
    marginTop: 16,
    textAlign: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10, // Higher than buffering overlay to ensure controls are always clickable
  },
  topControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
  },
  topButton: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  videoTitle: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  centerControlsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: height > 700 ? 20 : 16,
    width: '100%', // Ensure full width for proper centering
    alignSelf: 'center', // Center the container itself
  },
  // Single row for all controls with generous landscape spacing
  allControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10, // Reduced side padding to help centering
    width: '100%', // Ensure full width for proper centering
  },
  // Clean control icons without backgrounds (like the +10/-10 buttons)
  controlIcon: {
    paddingHorizontal: width > 600 ? 50 : 24, // Increased spacing for both modes
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Play/pause button - slightly larger but no background circle
  playPauseIcon: {
    paddingHorizontal: width > 600 ? 56 : 28, // Increased spacing for both modes
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControlsBar: {
    width: '100%',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  episodeTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  infoButtonText: {
    color: Colors.dark.text,
    fontSize: 12,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalScrollView: {
    maxHeight: 200,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  selectedModalItem: {
    backgroundColor: 'rgba(133, 98, 237, 0.1)',
  },
  modalItemText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  selectedModalItemText: {
    color: Colors.dark.buttonBackground,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: Colors.dark.buttonBackground,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#D32F2F',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Buffering overlay styles for integrated video player loader
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent', // No dark overlay - just show the spinner
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5, // Above video but below controls overlay (which should be higher)
  },
  // Episode navigation button styles - clean without backgrounds
  episodeNavButton: {
    paddingHorizontal: width > 600 ? 50 : 24, // Consistent with other controls
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.9,
  },
});