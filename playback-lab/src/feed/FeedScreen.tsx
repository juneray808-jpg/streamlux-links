import { FlashList, type ViewToken } from '@shopify/flash-list';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isSupabaseConfigured } from '../data/supabase';
import type { FeedItem } from '../data/types';
import { flattenFeedPages, useFeedQuery } from '../hooks/useFeedQuery';
import { Phase1DevOverlay } from '../instrumentation/Phase1DevOverlay';
import {
  isPhase1AOverlayEnabled,
  Phase1AStartupOverlay,
} from '../instrumentation/Phase1AStartupOverlay';
import { FeedCell } from './FeedCell';
import { useViewabilityBridge } from './ViewabilityBridge';

/**
 * Phase 1 feed — deterministic ownership only.
 * FlashList proposes via ViewabilityBridge; PlaybackEngine commits.
 */
export function FeedScreen() {
  const [rowHeight, setRowHeight] = useState(0);
  const query = useFeedQuery();
  const items = flattenFeedPages(query.data?.pages);
  const lastViewableRef = useRef<ViewToken<FeedItem>[]>([]);

  const { viewabilityConfig, onViewableItemsChanged, onScrollSettled } =
    useViewabilityBridge();

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0) setRowHeight(h);
  }, []);

  const handleViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken<FeedItem>[]; changed: ViewToken<FeedItem>[] }) => {
      lastViewableRef.current = info.viewableItems;
      onViewableItemsChanged(info);
    },
    [onViewableItemsChanged],
  );

  if (!isSupabaseConfigured()) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Supabase not configured</Text>
        <Text style={styles.errorBody}>
          Copy `.env.example` to `.env` and set EXPO_PUBLIC_SUPABASE_URL and
          EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={onLayout}>
      {rowHeight > 0 ? (
        <FlashList
          data={items}
          keyExtractor={(item) => item.postId}
          extraData={rowHeight}
          drawDistance={rowHeight}
          pagingEnabled
          snapToInterval={rowHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={handleViewableItemsChanged}
          onMomentumScrollEnd={() => onScrollSettled(lastViewableRef.current)}
          onScrollEndDrag={() => onScrollSettled(lastViewableRef.current)}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.6}
          renderItem={({ item, index }) => (
            <FeedCell item={item} index={index} rowHeight={rowHeight} />
          )}
          ListEmptyComponent={
            query.isLoading ? (
              <View style={[styles.center, { height: rowHeight }]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : query.isError ? (
              <View style={[styles.center, { height: rowHeight, padding: 24 }]}>
                <Text style={styles.errorTitle}>Feed error</Text>
                <Text style={styles.errorBody}>
                  {(query.error as Error)?.message ?? 'Unknown error'}
                </Text>
              </View>
            ) : (
              <View style={[styles.center, { height: rowHeight }]}>
                <Text style={styles.errorBody}>No feedable HLS posts</Text>
              </View>
            )
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color="#888" />
              </View>
            ) : null
          }
        />
      ) : null}

      {isPhase1AOverlayEnabled() ? <Phase1AStartupOverlay /> : null}
      {__DEV__ ? <Phase1DevOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorBody: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
