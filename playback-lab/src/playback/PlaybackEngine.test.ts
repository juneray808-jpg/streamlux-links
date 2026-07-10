import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import { NativePlayerAdapter } from './NativePlayerAdapter';
import type { NativePlayerEvent } from './types';
import { getPlaybackEngine, resetPlaybackEngineForTests } from './PlaybackEngine';

function createMockAdapter(postId: string) {
  let handler: ((event: NativePlayerEvent) => void) | null = null;
  const adapter = {
    postId,
    adapterId: `${postId}-mock`,
    bindEventHandler(h: (event: NativePlayerEvent) => void) {
      handler = h;
    },
    emitProgress(currentTimeSec: number) {
      handler?.({ kind: 'progress', postId, currentTimeSec });
    },
    assignSource() {},
    setVolume() {},
    pause() {},
    resume() {},
    getAssignedUrl() {
      return null;
    },
  };
  return adapter as unknown as NativePlayerAdapter;
}

describe('PlaybackEngine ownership', () => {
  beforeEach(() => {
    resetPlaybackEngineForTests();
    instrumentationBus.clear();
  });

  it('commits exactly one owner', () => {
    const engine = getPlaybackEngine();

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.9,
      source: 'viewability',
    });

    let snap = engine.getSnapshot();
    assert.equal(snap.ownerPostId, 'post-a');
    assert.equal(instrumentationBus.countKind('ownership_gained'), 1);

    engine.proposeOwnership({
      postId: 'post-b',
      index: 1,
      visibilityPercent: 0.85,
      source: 'viewability',
    });

    snap = engine.getSnapshot();
    assert.equal(snap.ownerPostId, 'post-b');
    assert.equal(instrumentationBus.countKind('ownership_released'), 1);
    assert.equal(instrumentationBus.countKind('ownership_gained'), 2);
  });

  it('rejects candidates below commit threshold', () => {
    const engine = getPlaybackEngine();

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.6,
      source: 'viewability',
    });

    assert.equal(engine.getSnapshot().ownerPostId, null);
    assert.equal(instrumentationBus.countKind('ownership_rejected'), 1);
  });

  it('returns stable snapshot references between bumps', () => {
    const engine = getPlaybackEngine();

    const before = engine.getSnapshot();
    assert.equal(engine.getSnapshot(), before);

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.9,
      source: 'viewability',
    });

    const after = engine.getSnapshot();
    assert.notEqual(after, before);
    assert.equal(engine.getSnapshot(), after);
    assert.equal(
      after.getCellUiState('post-a'),
      after.getCellUiState('post-a'),
    );
  });

  it('emits Phase 1A startup timeline events on commit', () => {
    const engine = getPlaybackEngine();

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.9,
      source: 'viewability',
    });

    assert.equal(instrumentationBus.countKind('ownership_candidate'), 1);
    assert.equal(instrumentationBus.countKind('ownership_validated'), 1);
    assert.equal(instrumentationBus.countKind('ownership_committed'), 1);
    assert.equal(instrumentationBus.countKind('ownership_gained'), 1);

    const committed = instrumentationBus
      .getAll()
      .find((e) => e.kind === 'ownership_committed');
    assert.equal(committed?.deltaFromCommitMs, 0);
  });

  it('does not bump on progress while already playing', () => {
    const engine = getPlaybackEngine();
    const mock = createMockAdapter('post-a');

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.9,
      source: 'viewability',
    });

    engine.registerAdapter('post-a', mock, 'https://example.com/video.m3u8');
    mock.emitProgress(0.05);

    const afterFirstFrame = engine.getSnapshot().version;

    for (let i = 0; i < 12; i++) {
      mock.emitProgress(1 + i);
    }

    assert.equal(engine.getSnapshot().version, afterFirstFrame);
  });

  it('instruments user pause and resume', () => {
    const engine = getPlaybackEngine();

    engine.proposeOwnership({
      postId: 'post-a',
      index: 0,
      visibilityPercent: 0.95,
      source: 'viewability',
    });

    engine.toggleUserPause();
    assert.equal(instrumentationBus.countKind('user_pause'), 1);
    assert.equal(engine.getSnapshot().getCellUiState('post-a').userPaused, true);

    engine.toggleUserPause();
    assert.equal(instrumentationBus.countKind('user_resume'), 1);
    assert.equal(engine.getSnapshot().getCellUiState('post-a').userPaused, false);
  });
});
