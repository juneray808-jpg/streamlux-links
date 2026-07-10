import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import type { PlaybackInstrumentEvent } from '../instrumentation/types';
import { usePlaybackEngineSnapshot } from '../hooks/usePlaybackEngine';

/** Phase 1 instrumentation overlay — ownership proof, not full Benchmark Mode (Phase 3). */
export function Phase1DevOverlay() {
  const snapshot = usePlaybackEngineSnapshot();
  const [recent, setRecent] = useState<PlaybackInstrumentEvent[]>(() =>
    instrumentationBus.getRecent(5),
  );

  useEffect(() => {
    return instrumentationBus.subscribe(() => {
      setRecent(instrumentationBus.getRecent(5));
    });
  }, []);

  const ownerUi =
    snapshot.ownerPostId != null
      ? snapshot.getCellUiState(snapshot.ownerPostId)
      : null;

  const audioOverlaps = instrumentationBus.countKind('audio_overlap');
  const violations = instrumentationBus.countKind('ownership_violation');

  return (
    <View style={styles.root} pointerEvents="none">
      <Text style={styles.title}>Phase 1 · ownership</Text>
      <Text style={styles.line}>
        owner: {snapshot.ownerPostId?.slice(0, 8) ?? '—'} @ {snapshot.ownerIndex}
      </Text>
      <Text style={styles.line}>
        gen: {snapshot.ownerGeneration} · phase: {ownerUi?.phase ?? '—'}
      </Text>
      <Text style={styles.line}>
        audio_overlap: {audioOverlaps} · violations: {violations}
      </Text>
      <Text style={styles.subtitle}>last events</Text>
      {recent.map((e, i) => (
        <Text key={`${e.ts}-${i}`} style={styles.event} numberOfLines={1}>
          {e.kind}
          {e.postId ? ` ${e.postId.slice(0, 6)}` : ''}
          {e.msSinceOwnership != null ? ` +${Math.round(e.msSinceOwnership)}ms` : ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 8,
    top: 48,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 8,
    padding: 8,
    zIndex: 20,
  },
  title: {
    color: '#6af',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  line: {
    color: '#ddd',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  event: {
    color: '#aaa',
    fontSize: 9,
    fontFamily: 'monospace',
  },
});
