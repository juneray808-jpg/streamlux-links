import { instrumentationBus } from './InstrumentationBus';
import {
  collectPumpPlayCounters,
  type PumpPlayScenarioResult,
  type PumpPlayScenarioScript,
  simulatePreFixCounters,
} from './PumpPlayMetrics';
import { getPlaybackEngine, resetPlaybackEngineForTests } from '../playback/PlaybackEngine';
import { NativePlayerAdapter } from '../playback/NativePlayerAdapter';
import type { NativePlayerEvent } from '../playback/types';

function createMockAdapter(postId: string) {
  let handler: ((event: NativePlayerEvent) => void) | null = null;
  let setSourceCalls = 0;

  const adapter = {
    postId,
    adapterId: `${postId}-bench`,
    bindEventHandler(h: (event: NativePlayerEvent) => void) {
      handler = h;
    },
    emit(event: Omit<NativePlayerEvent, 'postId'>) {
      handler?.({ ...event, postId });
    },
    assignSource(url: string) {
      const trimmed = url.trim();
      if (!trimmed) return;
      setSourceCalls += 1;
      instrumentationBus.emit('imperative_set_source', {
        postId,
        adapterId: adapter.adapterId,
        meta: { urlLength: trimmed.length },
      });
    },
    setVolume() {},
    pause() {},
    resume() {},
    getAssignedUrl() {
      return null;
    },
    getSetSourceCalls() {
      return setSourceCalls;
    },
  };

  return adapter as unknown as NativePlayerAdapter & { emit: (e: Omit<NativePlayerEvent, 'postId'>) => void };
}

export const PUMP_PLAY_SCENARIOS: PumpPlayScenarioScript[] = [
  {
    id: 'S1',
    label: '2s startup + 3s steady playback (@250ms progress)',
    legacyVideoSourceProp: true,
    legacyAudioEnabledPerApply: true,
    nativeEvents: [
      { kind: 'load_start' },
      { kind: 'ready_for_display' },
      ...Array.from({ length: 8 }, (_, i) => ({
        kind: 'progress' as const,
        currentTimeSec: i === 0 ? 0.05 : 0.5 + i * 0.25,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        kind: 'progress' as const,
        currentTimeSec: 2.5 + i * 0.25,
      })),
    ],
  },
  {
    id: 'S2',
    label: 'Startup with rebuffer burst (8 progress + buffer cycle)',
    legacyVideoSourceProp: true,
    legacyAudioEnabledPerApply: true,
    nativeEvents: [
      { kind: 'load_start' },
      { kind: 'progress', currentTimeSec: 0.01 },
      { kind: 'progress', currentTimeSec: 0.02 },
      { kind: 'buffer' },
      { kind: 'progress', currentTimeSec: 0.03 },
      { kind: 'end_buffer' },
      { kind: 'progress', currentTimeSec: 0.05 },
      { kind: 'ready_for_display' },
      ...Array.from({ length: 5 }, (_, i) => ({
        kind: 'progress' as const,
        currentTimeSec: 1 + i * 0.25,
      })),
    ],
  },
  {
    id: 'S3',
    label: 'Handoff: second post inherits adapter register only',
    legacyVideoSourceProp: true,
    legacyAudioEnabledPerApply: true,
    priorHandoff: true,
    nativeEvents: [
      { kind: 'load_start' },
      { kind: 'progress', currentTimeSec: 0.05 },
      ...Array.from({ length: 6 }, (_, i) => ({
        kind: 'progress' as const,
        currentTimeSec: 1 + i * 0.25,
      })),
    ],
  },
];

function measurePostFix(script: PumpPlayScenarioScript): ReturnType<typeof collectPumpPlayCounters> {
  resetPlaybackEngineForTests();
  instrumentationBus.clear();

  const engine = getPlaybackEngine();
  const postId = script.id === 'S3' ? 'post-b' : 'post-a';

  engine.proposeOwnership({
    postId: 'post-a',
    index: 0,
    visibilityPercent: 0.9,
    source: 'viewability',
  });

  if (script.id === 'S3') {
    const adapterA = createMockAdapter('post-a');
    engine.registerAdapter('post-a', adapterA, 'https://cdn.example/a.m3u8');
    adapterA.emit({ kind: 'progress', currentTimeSec: 0.05 });

    engine.proposeOwnership({
      postId: 'post-b',
      index: 1,
      visibilityPercent: 0.9,
      source: 'viewability',
    });
  }

  const adapter = createMockAdapter(postId);
  engine.registerAdapter(postId, adapter, `https://cdn.example/${postId}.m3u8`);

  for (const ev of script.nativeEvents) {
    adapter.emit(ev);
  }

  return collectPumpPlayCounters(instrumentationBus.getAll());
}

export function runPumpPlayBenchmark(): PumpPlayScenarioResult[] {
  return PUMP_PLAY_SCENARIOS.map((script) => ({
    scenarioId: script.id,
    label: script.label,
    before: simulatePreFixCounters(script),
    after: measurePostFix(script),
  }));
}
