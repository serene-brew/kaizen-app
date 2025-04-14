import { StyleSheet, Dimensions } from "react-native";
import Colors from "../constants/Colors";

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: PADDING,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: GAP,
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
});