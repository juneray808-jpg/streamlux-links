import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { RootStackParamList } from '../app/RootNavigator';
import { isSupabaseConfigured } from '../data/supabase';
import { flattenFeedPages, useFeedQuery } from '../hooks/useFeedQuery';
import { FeedRow } from './FeedRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

export function FeedScreen({ navigation }: Props) {
  const [rowHeight, setRowHeight] = useState(0);
  const query = useFeedQuery();
  const items = flattenFeedPages(query.data?.pages);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0) setRowHeight(h);
  }, []);

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
          drawDistance={rowHeight * 2}
          pagingEnabled
          snapToInterval={rowHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.6}
          renderItem={({ item, index }) => (
            <FeedRow item={item} index={index} rowHeight={rowHeight} />
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

      <Pressable
        style={styles.navButton}
        onPress={() => navigation.navigate('Placeholder')}
      >
        <Text style={styles.navButtonText}>Nav test →</Text>
      </Pressable>
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
  navButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  navButtonText: {
    color: '#ccc',
    fontSize: 12,
  },
});
