#!/usr/bin/env tsx
/**
 * Generate Phase 1A startup latency report from exported session JSON.
 *
 * Usage:
 *   npm run report:latency -- path/to/export.json
 *   cat export.json | npm run report:latency
 */
import { readFileSync } from 'node:fs';
import { generateInvestigationReport } from '../src/instrumentation/StartupLatencyAnalyzer';
import type { StartupLatencySession } from '../src/instrumentation/StartupLatencySession';

function readInput(path?: string): string {
  if (path) {
    return readFileSync(path, 'utf8');
  }
  return readFileSync(0, 'utf8');
}

type ExportPayload = {
  completed?: StartupLatencySession[];
};

const inputPath = process.argv[2];
const raw = readInput(inputPath);
const payload = JSON.parse(raw) as ExportPayload;
const sessions = payload.completed ?? [];

process.stdout.write(generateInvestigationReport(sessions));
