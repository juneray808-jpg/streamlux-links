import { Image, StyleSheet, Text, View } from 'react-native';
import type { FeedItem } from '../data/types';

type Props = {
  item: FeedItem;
  index: number;
  rowHeight: number;
};

/**
 * Phase 0 cell — poster + metadata only. No playback decisions (ADR-002).
 * PlaybackEngine integration begins Phase 1.
 */
export function FeedRow({ item, index, rowHeight }: Props) {
  return (
    <View style={[styles.row, { height: rowHeight }]}>
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.poster} resizeMode="contain" />
      ) : (
        <View style={styles.posterFallback} />
      )}
      <View style={styles.meta}>
        <Text style={styles.badge}>#{index + 1}</Text>
        <Text style={styles.caption} numberOfLines={3}>
          {item.caption?.trim() || '(no caption)'}
        </Text>
        <Text style={styles.hint} numberOfLines={1}>
          Phase 0 — fetch only
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  poster: {
    ...StyleSheet.absoluteFill,
  },
  posterFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#111',
  },
  meta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
  },
  badge: {
    color: '#6af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  caption: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: '#888',
    fontSize: 11,
    marginTop: 8,
  },
});
