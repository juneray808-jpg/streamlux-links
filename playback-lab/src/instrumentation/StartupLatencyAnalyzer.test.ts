import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import {
  aggregateStageStats,
  generateInvestigationReport,
  measureSessionStages,
  rankContributors,
} from '../instrumentation/StartupLatencyAnalyzer';
import type { StartupLatencySession } from '../instrumentation/StartupLatencySession';
import { getPlaybackEngine, resetPlaybackEngineForTests } from '../playback/PlaybackEngine';

function buildSyntheticSession(): StartupLatencySession {
  const events = [
    { ts: 1000, kind: 'ownership_candidate' as const, postId: 'post-a', deltaMs: 0 },
    { ts: 1002, kind: 'ownership_validated' as const, postId: 'post-a', deltaMs: 2 },
    { ts: 1005, kind: 'ownership_committed' as const, postId: 'post-a', ownerGeneration: 1, deltaMs: 3, deltaFromCommitMs: 0 },
    { ts: 1006, kind: 'previous_owner_muted' as const, postId: 'prev', ownerGeneration: 0, adapterId: 'prev-abc', deltaMs: 1, deltaFromCommitMs: 1 },
    { ts: 1007, kind: 'previous_owner_paused' as const, postId: 'prev', ownerGeneration: 0, adapterId: 'prev-abc', deltaMs: 1, deltaFromCommitMs: 2 },
    { ts: 1025, kind: 'react_cell_becomes_owner' as const, postId: 'post-a', ownerGeneration: 1, deltaMs: 18, deltaFromCommitMs: 20 },
    { ts: 1028, kind: 'source_assign' as const, postId: 'post-a', ownerGeneration: 1, adapterId: 'post-a-xyz', deltaMs: 3, deltaFromCommitMs: 23 },
    { ts: 1050, kind: 'native_load_start' as const, postId: 'post-a', ownerGeneration: 1, adapterId: 'post-a-xyz', deltaMs: 22, deltaFromCommitMs: 45 },
    { ts: 1180, kind: 'native_ready' as const, postId: 'post-a', ownerGeneration: 1, adapterId: 'post-a-xyz', deltaMs: 130, deltaFromCommitMs: 175 },
    { ts: 1200, kind: 'audio_enabled' as const, postId: 'post-a', ownerGeneration: 1, adapterId: 'post-a-xyz', deltaMs: 20, deltaFromCommitMs: 195 },
    { ts: 1350, kind: 'first_frame' as const, postId: 'post-a', ownerGeneration: 1, adapterId: 'post-a-xyz', deltaMs: 150, deltaFromCommitMs: 345 },
    { ts: 1350, kind: 'poster_hidden' as const, postId: 'post-a', ownerGeneration: 1, adapterId: 'post-a-xyz', deltaMs: 0, deltaFromCommitMs: 345 },
  ];

  return {
    sessionId: 'post-a:1',
    postId: 'post-a',
    ownerGeneration: 1,
    startedAt: 1000,
    committedAt: 1005,
    completedAt: 1350,
    events,
  };
}

describe('StartupLatencySession instrumentation', () => {
  beforeEach(() => {
    resetPlaybackEngineForTests();
    instrumentationBus.clear();
  });

  it('records deltas on ownership commit through first frame', () => {
    const engine = getPlaybackEngine();
    let t = 1000;
    const now = performance.now.bind(performance);
    performance.now = () => t;

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.9,
      source: 'viewability',
    });

    t = 1010;
    const events = instrumentationBus.getAll();
    assert.ok(events.some((e) => e.kind === 'ownership_candidate'));
    assert.ok(events.some((e) => e.kind === 'ownership_validated'));
    assert.ok(events.some((e) => e.kind === 'ownership_committed'));

    const committed = events.find((e) => e.kind === 'ownership_committed');
    assert.equal(committed?.deltaFromCommitMs, 0);

    performance.now = now;
  });

  it('measures stage durations from synthetic session', () => {
    const session = buildSyntheticSession();
    const stages = measureSessionStages(session);

    const loadToReady = stages.find((s) => s.stage === 'load_start_to_ready');
    assert.equal(loadToReady?.durationMs, 130);

    const total = stages.find((s) => s.stage === 'committed_to_first_frame');
    assert.equal(total?.durationMs, 345);
  });

  it('ranks dominant contributor from synthetic sessions', () => {
    const session = buildSyntheticSession();
    const stats = aggregateStageStats([session]);
    const ranks = rankContributors([session]);

    assert.ok(stats.length > 0);
    assert.ok(ranks.length > 0);
    assert.equal(ranks[0]!.stage, 'ready_to_first_frame');
    assert.ok(ranks[0]!.sharePercent > 0);
  });

  it('generates investigation report markdown', () => {
    const report = generateInvestigationReport([buildSyntheticSession()]);
    assert.ok(report.includes('## 1. Timeline diagram'));
    assert.ok(report.includes('ready_to_first_frame') || report.includes('READY → first frame'));
    assert.ok(report.includes('345'));
  });
});
