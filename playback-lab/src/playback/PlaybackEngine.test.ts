import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import { getPlaybackEngine, resetPlaybackEngineForTests } from './PlaybackEngine';

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
