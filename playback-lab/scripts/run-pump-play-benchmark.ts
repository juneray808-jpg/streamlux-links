#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { runPumpPlayBenchmark } from '../src/instrumentation/PumpPlayBenchmark';
import {
  computeImprovements,
  formatPumpPlayResultsTable,
} from '../src/instrumentation/PumpPlayMetrics';

const results = runPumpPlayBenchmark();
const generatedAt = new Date().toISOString();

const lines: string[] = [
  '## Measured before/after (automated benchmark)',
  '',
  `**Generated:** ${generatedAt}`,
  '**Method:** `simulatePreFixCounters()` replays legacy engine rules; `runPumpPlayBenchmark()` measures instrumented post-fix engine with mock adapter. Run via `npm run benchmark:pump-play`.',
  '',
  formatPumpPlayResultsTable(results),
  '',
  '### Per-fix evidence mapping',
  '',
];

for (const result of results) {
  lines.push(`#### ${result.scenarioId}: ${result.label}`);
  lines.push('');
  for (const row of computeImprovements(result.before, result.after)) {
    if (row.before === 0 && row.after === 0) continue;
    const pct = row.deltaPercent != null ? ` (${row.deltaPercent.toFixed(1)}% reduction)` : '';
    lines.push(`- ${row.label}: **${row.before} → ${row.after}**${pct}`);
  }
  lines.push('');
}

const outPath = new URL('../docs/PUMP_PLAY_BENCHMARK_RESULTS.md', import.meta.url);
writeFileSync(outPath, lines.join('\n'));
process.stdout.write(lines.join('\n'));
