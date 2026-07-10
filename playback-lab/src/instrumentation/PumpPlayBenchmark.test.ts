import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runPumpPlayBenchmark } from './PumpPlayBenchmark';
import { computeImprovements, formatPumpPlayResultsTable } from './PumpPlayMetrics';

describe('PumpPlayBenchmark', () => {
  it('measures before/after improvements for scripted scenarios', () => {
    const results = runPumpPlayBenchmark();

    assert.equal(results.length, 3);

    const s1 = results.find((r) => r.scenarioId === 'S1');
    assert.ok(s1);

    // Fix 1: dirty-only bump — steady progress after first frame
    assert.equal(s1.before.engineSnapshotBumpsFromProgress, 20);
    assert.equal(s1.after.engineSnapshotBumpsFromProgress, 1);
    assert.equal(s1.after.progressSnapshotSuppressed, 19);

    // Fix 2: single source path
    assert.equal(s1.before.videoSourcePropLoads, 1);
    assert.equal(s1.after.videoSourcePropLoads, 0);
    assert.equal(s1.before.imperativeSetSourceCalls, 1);
    assert.equal(s1.after.imperativeSetSourceCalls, 1);

    const s2 = results.find((r) => r.scenarioId === 'S2');
    assert.ok(s2);
    assert.ok(s2.before.engineSnapshotBumps > s2.after.engineSnapshotBumps);

    const table = formatPumpPlayResultsTable(results);
    assert.ok(table.includes('Snapshot bumps caused by progress'));
    assert.ok(table.includes('Video source prop loads'));
  });

  it('documents expected reduction percentages for S1', () => {
    const s1 = runPumpPlayBenchmark().find((r) => r.scenarioId === 'S1')!;
    const improvements = computeImprovements(s1.before, s1.after);

    const progressBumps = improvements.find(
      (i) => i.metric === 'engineSnapshotBumpsFromProgress',
    );
    assert.equal(progressBumps?.before, 20);
    assert.equal(progressBumps?.after, 1);
    assert.equal(progressBumps?.deltaPercent, 95);

    const propLoads = improvements.find((i) => i.metric === 'videoSourcePropLoads');
    assert.equal(propLoads?.before, 1);
    assert.equal(propLoads?.after, 0);
    assert.equal(propLoads?.deltaPercent, 100);
  });
});
