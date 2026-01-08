import { StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: Colors.dark.background,
  },
  errorText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: Colors.dark.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  mangaTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  chapterTitle: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginTop: 2,
  },
  pagesContainer: {
    backgroundColor: Colors.dark.background,
  },
  pageContainer: {
    width: width,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageImage: {
    width: width,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(22, 22, 34, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageNumberText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pageLoadingContainer: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  pageLoadingText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginTop: 8,
  },
});
