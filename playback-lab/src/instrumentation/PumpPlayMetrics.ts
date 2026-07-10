import type { InstrumentKind, PlaybackInstrumentEvent } from './types';

/** Pump-play investigation counters (instrumentation only). */
export type PumpPlayMetricKind =
  | 'engine_snapshot_bump'
  | 'progress_snapshot_suppressed'
  | 'imperative_set_source'
  | 'video_source_prop_load'
  | 'feed_cell_layout_reflow';

export type PumpPlayCounters = {
  engineSnapshotBumps: number;
  engineSnapshotBumpsFromProgress: number;
  progressEventsReceived: number;
  progressSnapshotSuppressed: number;
  sourceAssignEvents: number;
  imperativeSetSourceCalls: number;
  videoSourcePropLoads: number;
  audioEnabledEvents: number;
  feedCellLayoutReflows: number;
  nativeLoadStartEvents: number;
};

export type PumpPlayScenarioResult = {
  scenarioId: string;
  label: string;
  /** Pre-fix behavior reproduced by deterministic replay of legacy rules. */
  before: PumpPlayCounters;
  /** Post-fix behavior measured from instrumented engine + adapter. */
  after: PumpPlayCounters;
};

export type PumpPlayImprovement = {
  metric: keyof PumpPlayCounters | 'totalNativeLoadInitiations';
  label: string;
  before: number;
  after: number;
  delta: number;
  deltaPercent: number | null;
};

const PUMP_PLAY_KINDS: readonly PumpPlayMetricKind[] = [
  'engine_snapshot_bump',
  'progress_snapshot_suppressed',
  'imperative_set_source',
  'video_source_prop_load',
  'feed_cell_layout_reflow',
];

export function isPumpPlayMetricKind(kind: InstrumentKind | PumpPlayMetricKind): boolean {
  return (PUMP_PLAY_KINDS as readonly string[]).includes(kind);
}

export function emptyPumpPlayCounters(): PumpPlayCounters {
  return {
    engineSnapshotBumps: 0,
    engineSnapshotBumpsFromProgress: 0,
    progressEventsReceived: 0,
    progressSnapshotSuppressed: 0,
    sourceAssignEvents: 0,
    imperativeSetSourceCalls: 0,
    videoSourcePropLoads: 0,
    audioEnabledEvents: 0,
    feedCellLayoutReflows: 0,
    nativeLoadStartEvents: 0,
  };
}

export function collectPumpPlayCounters(events: PlaybackInstrumentEvent[]): PumpPlayCounters {
  const c = emptyPumpPlayCounters();

  for (const e of events) {
    switch (e.kind) {
      case 'engine_snapshot_bump':
        c.engineSnapshotBumps += 1;
        if (
          e.meta?.reason === 'first_frame' ||
          e.meta?.reason === 'progress_phase'
        ) {
          c.engineSnapshotBumpsFromProgress += 1;
        }
        break;
      case 'progress_snapshot_suppressed':
        c.progressSnapshotSuppressed += 1;
        c.progressEventsReceived += 1;
        break;
      case 'source_assign':
        c.sourceAssignEvents += 1;
        break;
      case 'imperative_set_source':
        c.imperativeSetSourceCalls += 1;
        break;
      case 'video_source_prop_load':
        c.videoSourcePropLoads += 1;
        break;
      case 'audio_enabled':
        c.audioEnabledEvents += 1;
        break;
      case 'feed_cell_layout_reflow':
        c.feedCellLayoutReflows += 1;
        break;
      case 'native_load_start':
        c.nativeLoadStartEvents += 1;
        break;
      default:
        break;
    }
  }

  // Progress that caused a bump is counted via engine_snapshot_bump reason=progress
  const progressBumps = events.filter(
    (e) =>
      e.kind === 'engine_snapshot_bump' &&
      (e.meta?.reason === 'first_frame' || e.meta?.reason === 'progress_phase'),
  ).length;
  const progressSuppressed = events.filter((e) => e.kind === 'progress_snapshot_suppressed').length;
  c.progressEventsReceived = progressBumps + progressSuppressed;

  return c;
}

export type ScriptedNativeEvent =
  | { kind: 'progress'; currentTimeSec: number }
  | { kind: 'buffer' }
  | { kind: 'end_buffer' }
  | { kind: 'load_start' }
  | { kind: 'ready_for_display' };

export type PumpPlayScenarioScript = {
  id: string;
  label: string;
  /** Native events delivered after ownership + adapter registration. */
  nativeEvents: ScriptedNativeEvent[];
  /** Legacy FeedCell passed `source` prop on Video mount (pre-fix). */
  legacyVideoSourceProp: boolean;
  /** Legacy applyOwnerPlaybackIntent emitted audio_enabled every call (pre-fix). */
  legacyAudioEnabledPerApply: boolean;
  /** Include a prior ownership handoff before scripted events (S3). */
  priorHandoff?: boolean;
};

/**
 * Deterministic replay of pre-fix engine rules (always bump on native handler exit;
 * dual source path; audio_enabled on every applyOwnerPlaybackIntent).
 */
export function simulatePreFixCounters(script: PumpPlayScenarioScript): PumpPlayCounters {
  const c = emptyPumpPlayCounters();

  const registerLegacyOwner = () => {
    c.engineSnapshotBumps += 1; // commitOwnership bump
    c.sourceAssignEvents += 1;
    c.imperativeSetSourceCalls += 1;
    if (script.legacyVideoSourceProp) {
      c.videoSourcePropLoads += 1;
    }
    if (script.legacyAudioEnabledPerApply) {
      c.audioEnabledEvents += 1;
    }
  };

  if (script.priorHandoff) {
    registerLegacyOwner();
    c.engineSnapshotBumps += 1; // second commit
  }

  registerLegacyOwner();

  let firstFrameRendered = false;
  let phase: string = 'loading';
  let buffering = false;

  for (const ev of script.nativeEvents) {
    switch (ev.kind) {
      case 'load_start':
        phase = 'loading';
        c.engineSnapshotBumps += 1;
        c.nativeLoadStartEvents += 1;
        break;
      case 'ready_for_display':
        c.engineSnapshotBumps += 1;
        break;
      case 'progress':
        c.progressEventsReceived += 1;
        if (!firstFrameRendered && ev.currentTimeSec >= 0.033) {
          firstFrameRendered = true;
          phase = 'playing';
        } else if (!buffering) {
          phase = 'playing';
        }
        c.engineSnapshotBumps += 1;
        c.engineSnapshotBumpsFromProgress += 1;
        break;
      case 'buffer':
        buffering = true;
        if (!firstFrameRendered) phase = 'buffering';
        c.engineSnapshotBumps += 1;
        break;
      case 'end_buffer':
        buffering = false;
        if (!buffering) phase = 'playing';
        c.engineSnapshotBumps += 1;
        break;
      default:
        break;
    }
  }

  return c;
}

export function computeImprovements(
  before: PumpPlayCounters,
  after: PumpPlayCounters,
): PumpPlayImprovement[] {
  const totalLoadBefore = before.videoSourcePropLoads + before.imperativeSetSourceCalls;
  const totalLoadAfter = after.videoSourcePropLoads + after.imperativeSetSourceCalls;

  const keys: { key: keyof PumpPlayCounters; label: string }[] = [
    { key: 'engineSnapshotBumps', label: 'Engine snapshot bumps (UI re-render triggers)' },
    { key: 'engineSnapshotBumpsFromProgress', label: 'Snapshot bumps caused by progress' },
    { key: 'progressSnapshotSuppressed', label: 'Progress ticks suppressed (no bump)' },
    { key: 'imperativeSetSourceCalls', label: 'Imperative setSource calls' },
    { key: 'videoSourcePropLoads', label: 'Video source prop loads' },
    { key: 'nativeLoadStartEvents', label: 'Native LOAD_START events' },
    { key: 'audioEnabledEvents', label: 'audio_enabled instrumentation events' },
    { key: 'sourceAssignEvents', label: 'source_assign events' },
  ];

  const rows: PumpPlayImprovement[] = keys.map(({ key, label }) => {
    const b = before[key];
    const a = after[key];
    const delta = a - b;
    const deltaPercent = b > 0 ? ((b - a) / b) * 100 : null;
    return { metric: key, label, before: b, after: a, delta, deltaPercent };
  });

  rows.push({
    metric: 'totalNativeLoadInitiations',
    label: 'Total native load initiations (prop + imperative)',
    before: totalLoadBefore,
    after: totalLoadAfter,
    delta: totalLoadAfter - totalLoadBefore,
    deltaPercent: totalLoadBefore > 0 ? ((totalLoadBefore - totalLoadAfter) / totalLoadBefore) * 100 : null,
  });

  return rows;
}

export function formatPumpPlayResultsTable(results: PumpPlayScenarioResult[]): string {
  const lines = [
    '| Scenario | Metric | Before (pre-fix replay) | After (measured) | Δ | Δ% |',
    '|----------|--------|-------------------------|------------------|---|-----|',
  ];

  for (const result of results) {
    const improvements = computeImprovements(result.before, result.after);
    for (const row of improvements) {
      if (row.before === 0 && row.after === 0) continue;
      const pct = row.deltaPercent != null ? `${row.deltaPercent.toFixed(1)}%` : '—';
      lines.push(
        `| ${result.scenarioId} | ${row.label} | ${row.before} | ${row.after} | ${row.delta} | ${pct} |`,
      );
    }
  }

  return lines.join('\n');
}
