import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, { type OnProgressData, type VideoRef } from 'react-native-video';
import type { FeedItem } from '../data/types';
import { useCellUiState } from '../hooks/usePlaybackEngine';
import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import { getPlaybackEngine } from '../playback/PlaybackEngine';
import { NativePlayerAdapter } from '../playback/NativePlayerAdapter';

type Props = {
  item: FeedItem;
  index: number;
  rowHeight: number;
};

/**
 * Phase 1 feed cell — UI only. Playback decisions belong to PlaybackEngine (ADR-002).
 * Only the owner mounts a Video decoder (single owner / single audible player).
 */
export function FeedCell({ item, index, rowHeight }: Props) {
  const engine = useRef(getPlaybackEngine()).current;
  const ui = useCellUiState(item.postId);
  const videoRef = useRef<VideoRef>(null);
  const adapterRef = useRef<NativePlayerAdapter | null>(null);

  const isOwner = ui.isOwner;
  const layoutSizeRef = useRef({ width: 0, height: 0 });

  const onRowLayout = useCallback(
    (width: number, height: number) => {
      const prev = layoutSizeRef.current;
      if (prev.width > 0 && (prev.width !== width || prev.height !== height)) {
        instrumentationBus.emit('feed_cell_layout_reflow', {
          postId: item.postId,
          index,
          meta: { width, height, prevWidth: prev.width, prevHeight: prev.height },
        });
      }
      layoutSizeRef.current = { width, height };
    },
    [index, item.postId],
  );

  useEffect(() => {
    if (!isOwner) {
      adapterRef.current = null;
      return;
    }

    const snapshot = engine.getSnapshot();
    instrumentationBus.emit('react_cell_becomes_owner', {
      postId: item.postId,
      index,
      ownerGeneration: snapshot.ownerGeneration,
    });

    const adapter = new NativePlayerAdapter(item.postId, videoRef);
    adapterRef.current = adapter;
    engine.registerAdapter(item.postId, adapter, item.hlsUrl);

    return () => {
      engine.unregisterAdapter(item.postId);
      adapterRef.current = null;
    };
  }, [engine, isOwner, index, item.hlsUrl, item.postId]);

  const onTap = () => {
    if (!ui.isOwner) return;
    engine.toggleUserPause();
  };

  return (
    <Pressable
      style={[styles.row, { height: rowHeight }]}
      onPress={onTap}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        onRowLayout(Math.round(width), Math.round(height));
      }}
    >
      {isOwner ? (
        <Video
          ref={videoRef}
          style={styles.media}
          resizeMode="contain"
          paused={ui.userPaused}
          muted={!ui.audioEnabled}
          repeat={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          progressUpdateInterval={1000}
          useTextureView={Platform.OS !== 'android'}
          onLoadStart={() => {
            adapterRef.current?.emitNativeEvent({ kind: 'load_start' });
          }}
          onReadyForDisplay={() => {
            adapterRef.current?.emitNativeEvent({ kind: 'ready_for_display' });
          }}
          onProgress={(e: OnProgressData) => {
            adapterRef.current?.emitNativeEvent({
              kind: 'progress',
              currentTimeSec: e.currentTime,
            });
          }}
          onBuffer={({ isBuffering }) => {
            adapterRef.current?.emitNativeEvent({
              kind: isBuffering ? 'buffer' : 'end_buffer',
            });
          }}
          onError={(e) => {
            adapterRef.current?.emitNativeEvent({
              kind: 'error',
              errorMessage: String(e.error?.errorString ?? 'error'),
            });
          }}
        />
      ) : item.posterUrl ? (
        <Image
          source={{ uri: item.posterUrl }}
          style={styles.media}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.media, styles.posterFallback]} />
      )}

      {isOwner && ui.posterVisible && item.posterUrl ? (
        <Image
          source={{ uri: item.posterUrl }}
          style={[styles.media, styles.posterOverlay]}
          resizeMode="contain"
        />
      ) : null}

      {isOwner && ui.spinnerVisible ? (
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : null}

      <View style={styles.meta} pointerEvents="none">
        <Text style={styles.badge}>#{index + 1}</Text>
        {ui.isOwner ? (
          <Text style={styles.phase}>
            owner · {ui.phase}
            {ui.userPaused ? ' · paused' : ''}
          </Text>
        ) : null}
        <Text style={styles.caption} numberOfLines={2}>
          {item.caption?.trim() || '(no caption)'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  media: {
    ...StyleSheet.absoluteFill,
  },
  posterFallback: {
    backgroundColor: '#111',
  },
  posterOverlay: {
    zIndex: 2,
  },
  spinnerWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  meta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
    zIndex: 4,
  },
  badge: {
    color: '#6af',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  phase: {
    color: '#8f8',
    fontSize: 11,
    marginBottom: 4,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
