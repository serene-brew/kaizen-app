import { StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING,
    paddingTop: 55,
    paddingBottom: 12,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.secondaryBackground,
  },
  content: {
    paddingHorizontal: PADDING,
    paddingBottom: 80,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: GAP + 4,
  },
  cover: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    borderRadius: 8,
    backgroundColor: Colors.dark.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(22, 22, 34, 0.7)',
    borderRadius: 18,
    padding: 4,
  },
  cardTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PADDING,
  },
  emptyText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHint: {
    color: Colors.dark.secondaryText,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    marginTop: 12,
  },
});
