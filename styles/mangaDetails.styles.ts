import { StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverWrapper: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.dark.secondaryBackground,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  titleBlock: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  metaChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  metaText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  chipText: {
    color: Colors.dark.text,
    fontSize: 12,
  },
  chaptersSection: {
    marginTop: 24,
  },
  chapterList: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chapterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.dark.secondaryBackground,
  },
  chapterText: {
    color: Colors.dark.text,
    fontSize: 12,
  },
  readlistButton: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: Colors.dark.buttonBackground,
  },
  readlistButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
  },
  errorText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyChaptersText: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
});
