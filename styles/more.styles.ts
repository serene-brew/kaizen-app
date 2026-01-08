import { StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 60,
    paddingBottom: 160,  // Line 222 must be changed as well for this one to take effect
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  accountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  email: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
    marginTop: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
  },
  section: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  sectionTitle: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    color: Colors.dark.text,
    fontSize: 16,
    flex: 1,
  },
  menuValue: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
  },
  dangerText: {
    color: '#DC3545',
  },
  brandText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  // Watch History Hero Section
  heroSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  watchHistoryHero: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroTitleContainer: {
    marginLeft: 16,
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  lastWatchedSection: {
    marginTop: 8,
  },
  lastWatchedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.secondaryText,
    marginBottom: 12,
  },
  lastWatchedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    marginTop: 12,
  },
  lastWatchedThumbnail: {
    width: 80,
    height: 120, // 2:3 aspect ratio (80 * 1.5 = 120) to match app standard
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  lastWatchedContent: {
    flex: 1,
    marginRight: 8,
  },
  lastWatchedAnime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  lastWatchedEpisode: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBackground: {
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.buttonBackground,
    borderRadius: 2,
    minWidth: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.dark.secondaryText,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.secondaryText,
    marginTop: 12,
    textAlign: 'center',
  },
  // Profile Section at Bottom
  profileSection: {
    marginBottom: 80,  // This one also for bottom padding, needs to be changed
    paddingHorizontal: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.dark.secondaryText,
  },
  profileEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.buttonBackground,
  },
  profileEditText: {
    color: Colors.dark.buttonBackground,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 22, 34, 0.85)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.dark.secondaryBackground,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.dark.text,
    fontSize: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  textInput: {
    width: '100%',
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.dark.background,
  },
  saveButton: {
    backgroundColor: Colors.dark.buttonBackground,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // About Modal Styles
  aboutHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aboutTitle: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
  },
  aboutVersion: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginTop: 4,
  },
  aboutDescription: {
    color: Colors.dark.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  aboutFeatures: {
    width: '100%',
    marginBottom: 24,
  },
  aboutFeatureTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  aboutFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aboutFeatureText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 8,
  },
  developerLink: {
    width: '100%',
    paddingVertical: 4,
  },
  closeButton: {
    backgroundColor: Colors.dark.buttonBackground,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  closeButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  aboutIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  appIconImage: {
    width: 60,
    height: 60,
    borderRadius: 40, // Make it circular
    overflow: 'hidden',
  },
  aboutLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
});