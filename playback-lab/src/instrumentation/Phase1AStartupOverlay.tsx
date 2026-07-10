import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import { generateInvestigationReport } from '../instrumentation/StartupLatencyAnalyzer';
import type { PlaybackInstrumentEvent } from '../instrumentation/types';
import { usePlaybackEngineSnapshot } from '../hooks/usePlaybackEngine';

const LATENCY_INVESTIGATION =
  typeof process !== 'undefined' &&
  process.env.EXPO_PUBLIC_LATENCY_INVESTIGATION === '1';

/** Phase 1A — startup latency session overlay (instrumentation only). */
export function Phase1AStartupOverlay() {
  const snapshot = usePlaybackEngineSnapshot();
  const [recent, setRecent] = useState<PlaybackInstrumentEvent[]>(() =>
    instrumentationBus.getRecent(8),
  );
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    return instrumentationBus.subscribe((event) => {
      setRecent(instrumentationBus.getRecent(8));
      setSessionCount(instrumentationBus.getCompletedStartupSessions().length);
    });
  }, []);

  const latest = instrumentationBus.getLatestCompletedStartupSession();
  const lastEvent = recent.at(-1);

  const onExport = () => {
    const json = instrumentationBus.exportStartupSessionsJson();
    const report = generateInvestigationReport(
      instrumentationBus.getCompletedStartupSessions(),
    );
    const bundle = `${json}\n\n---REPORT---\n\n${report}`;
    void Share.share({ message: bundle }).catch(() => {
      // eslint-disable-next-line no-console
      console.log('[Phase1A] export', bundle);
    });
  };

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.panel} pointerEvents="auto">
        <Text style={styles.title}>Phase 1A · startup latency</Text>
        <Text style={styles.line}>
          owner: {snapshot.ownerPostId?.slice(0, 8) ?? '—'} gen {snapshot.ownerGeneration}
        </Text>
        <Text style={styles.line}>
          sessions: {sessionCount}
          {latest ? ` · last ${latest.completedAt! - latest.committedAt!}ms` : ''}
        </Text>
        {lastEvent ? (
          <Text style={styles.line} numberOfLines={1}>
            {lastEvent.kind} Δ{lastEvent.deltaMs?.toFixed(0) ?? '?'} commit+
            {lastEvent.deltaFromCommitMs?.toFixed(0) ?? '?'}
          </Text>
        ) : null}
        <Pressable style={styles.button} onPress={onExport}>
          <Text style={styles.buttonText}>Copy sessions + report</Text>
        </Pressable>
        <Text style={styles.subtitle}>recent</Text>
        {recent.map((e, i) => (
          <Text key={`${e.ts}-${i}`} style={styles.event} numberOfLines={1}>
            {e.kind}
            {e.deltaFromCommitMs != null ? ` +${e.deltaFromCommitMs.toFixed(0)}ms` : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function isPhase1AOverlayEnabled(): boolean {
  return (typeof __DEV__ !== 'undefined' && __DEV__) || LATENCY_INVESTIGATION;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 30,
  },
  panel: {
    margin: 8,
    marginTop: 48,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 8,
    padding: 8,
  },
  title: {
    color: '#fa6',
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
  button: {
    marginTop: 6,
    backgroundColor: '#234',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#8cf',
    fontSize: 10,
    fontWeight: '600',
  },
});
