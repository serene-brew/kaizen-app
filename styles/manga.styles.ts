import { StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
    height: CARD_WIDTH * 1.6,
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
  readlistIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(22, 22, 34, 0.7)',
    borderRadius: 18,
    padding: 4,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  subtitle: {
    color: Colors.dark.secondaryText,
    fontSize: 12,
    marginTop: 4,
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
    paddingHorizontal: PADDING,
  },
  errorText: {
    color: Colors.dark.secondaryText,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
});
