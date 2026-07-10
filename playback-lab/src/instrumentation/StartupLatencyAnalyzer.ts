import type { InstrumentKind } from './types';
import type { StartupLatencySession } from './StartupLatencySession';

/** Measured stage between two canonical timeline events. */
export type StartupLatencyStage =
  | 'candidate_to_validated'
  | 'validated_to_committed'
  | 'committed_to_prev_muted'
  | 'prev_muted_to_prev_paused'
  | 'prev_paused_to_react_owner'
  | 'committed_to_react_owner'
  | 'react_owner_to_source_assign'
  | 'source_assign_to_load_start'
  | 'load_start_to_ready'
  | 'ready_to_first_frame'
  | 'first_frame_to_poster_hidden'
  | 'committed_to_first_frame'
  | 'committed_to_audio_enabled';

export type StageMeasurement = {
  stage: StartupLatencyStage;
  label: string;
  durationMs: number;
  sessionId: string;
  postId: string;
};

export type StageStats = {
  stage: StartupLatencyStage;
  label: string;
  count: number;
  mean: number;
  median: number;
  p95: number;
  max: number;
};

export type ContributorRank = {
  stage: StartupLatencyStage;
  label: string;
  meanMs: number;
  sharePercent: number;
};

export type OptimizationOpportunity = {
  stage: StartupLatencyStage;
  label: string;
  expectedBenefit: string;
  risk: 'low' | 'medium' | 'high';
  complexity: 'low' | 'medium' | 'high';
  architectureImpact: 'none' | 'implementation-only' | 'architectural';
};

const STAGE_LABELS: Record<StartupLatencyStage, string> = {
  candidate_to_validated: 'Candidate proposed → validated',
  validated_to_committed: 'Validated → committed',
  committed_to_prev_muted: 'Committed → previous owner muted',
  prev_muted_to_prev_paused: 'Previous owner muted → paused',
  prev_paused_to_react_owner: 'Previous owner paused → React cell becomes owner',
  committed_to_react_owner: 'Committed → React cell becomes owner',
  react_owner_to_source_assign: 'React owner mount → source assignment',
  source_assign_to_load_start: 'Source assignment → native LOAD_START',
  load_start_to_ready: 'LOAD_START → native READY',
  ready_to_first_frame: 'READY → first frame',
  first_frame_to_poster_hidden: 'First frame → poster hidden',
  committed_to_first_frame: 'Committed → first frame (total startup)',
  committed_to_audio_enabled: 'Committed → audio enabled',
};

type StageDef = {
  stage: StartupLatencyStage;
  from: InstrumentKind;
  to: InstrumentKind;
};

const STAGE_DEFS: StageDef[] = [
  { stage: 'candidate_to_validated', from: 'ownership_candidate', to: 'ownership_validated' },
  { stage: 'validated_to_committed', from: 'ownership_validated', to: 'ownership_committed' },
  { stage: 'committed_to_prev_muted', from: 'ownership_committed', to: 'previous_owner_muted' },
  { stage: 'prev_muted_to_prev_paused', from: 'previous_owner_muted', to: 'previous_owner_paused' },
  { stage: 'prev_paused_to_react_owner', from: 'previous_owner_paused', to: 'react_cell_becomes_owner' },
  { stage: 'committed_to_react_owner', from: 'ownership_committed', to: 'react_cell_becomes_owner' },
  { stage: 'react_owner_to_source_assign', from: 'react_cell_becomes_owner', to: 'source_assign' },
  { stage: 'source_assign_to_load_start', from: 'source_assign', to: 'native_load_start' },
  { stage: 'load_start_to_ready', from: 'native_load_start', to: 'native_ready' },
  { stage: 'ready_to_first_frame', from: 'native_ready', to: 'first_frame' },
  { stage: 'first_frame_to_poster_hidden', from: 'first_frame', to: 'poster_hidden' },
  { stage: 'committed_to_first_frame', from: 'ownership_committed', to: 'first_frame' },
  { stage: 'committed_to_audio_enabled', from: 'ownership_committed', to: 'audio_enabled' },
];

function findEventTs(session: StartupLatencySession, kind: InstrumentKind): number | null {
  const hit = session.events.find((e) => e.kind === kind);
  return hit?.ts ?? null;
}

function firstEventTs(session: StartupLatencySession, kind: InstrumentKind): number | null {
  const hit = session.events.find((e) => e.kind === kind);
  return hit?.ts ?? null;
}

export function measureSessionStages(session: StartupLatencySession): StageMeasurement[] {
  const out: StageMeasurement[] = [];

  for (const def of STAGE_DEFS) {
    const fromTs = firstEventTs(session, def.from);
    const toTs = firstEventTs(session, def.to);
    if (fromTs == null || toTs == null || toTs < fromTs) continue;

    out.push({
      stage: def.stage,
      label: STAGE_LABELS[def.stage],
      durationMs: toTs - fromTs,
      sessionId: session.sessionId,
      postId: session.postId,
    });
  }

  return out;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

export function aggregateStageStats(sessions: StartupLatencySession[]): StageStats[] {
  const byStage = new Map<StartupLatencyStage, number[]>();

  for (const session of sessions) {
    for (const m of measureSessionStages(session)) {
      const arr = byStage.get(m.stage) ?? [];
      arr.push(m.durationMs);
      byStage.set(m.stage, arr);
    }
  }

  const stats: StageStats[] = [];
  for (const def of STAGE_DEFS) {
    const values = (byStage.get(def.stage) ?? []).slice().sort((a, b) => a - b);
    if (values.length === 0) continue;

    const sum = values.reduce((a, b) => a + b, 0);
    stats.push({
      stage: def.stage,
      label: STAGE_LABELS[def.stage],
      count: values.length,
      mean: sum / values.length,
      median: percentile(values, 50),
      p95: percentile(values, 95),
      max: values[values.length - 1]!,
    });
  }

  return stats;
}

/** Rank stages by mean duration share of committed→first_frame total. */
export function rankContributors(
  sessions: StartupLatencySession[],
): ContributorRank[] {
  const stats = aggregateStageStats(sessions);
  const totalStat = stats.find((s) => s.stage === 'committed_to_first_frame');
  const totalMean = totalStat?.mean ?? 0;

  const segmentStages: StartupLatencyStage[] = [
    'candidate_to_validated',
    'validated_to_committed',
    'committed_to_prev_muted',
    'prev_muted_to_prev_paused',
    'prev_paused_to_react_owner',
    'committed_to_react_owner',
    'react_owner_to_source_assign',
    'source_assign_to_load_start',
    'load_start_to_ready',
    'ready_to_first_frame',
  ];

  const ranks: ContributorRank[] = [];
  for (const stage of segmentStages) {
    const stat = stats.find((s) => s.stage === stage);
    if (!stat || totalMean <= 0) continue;
    ranks.push({
      stage,
      label: stat.label,
      meanMs: stat.mean,
      sharePercent: (stat.mean / totalMean) * 100,
    });
  }

  return ranks.sort((a, b) => b.sharePercent - a.sharePercent);
}

export function buildMermaidTimeline(session: StartupLatencySession): string {
  const lines = ['sequenceDiagram', '  participant VB as ViewabilityBridge', '  participant PE as PlaybackEngine', '  participant RC as React/FeedCell', '  participant NP as NativePlayer'];

  for (const event of session.events) {
    const delta = event.deltaFromCommitMs != null ? ` +${event.deltaFromCommitMs.toFixed(0)}ms` : '';
    const actor =
      event.kind.startsWith('native_') || event.kind === 'first_frame' || event.kind === 'poster_hidden' || event.kind === 'audio_enabled'
        ? 'NP'
        : event.kind.startsWith('react_')
          ? 'RC'
          : event.kind === 'ownership_candidate'
            ? 'VB'
            : 'PE';
    lines.push(`  ${actor}->>${actor}: ${event.kind}${delta}`);
  }

  return lines.join('\n');
}

export function optimizationOpportunities(stats: StageStats[]): OptimizationOpportunity[] {
  const map: Partial<Record<StartupLatencyStage, OptimizationOpportunity>> = {
    committed_to_react_owner: {
      stage: 'committed_to_react_owner',
      label: STAGE_LABELS.committed_to_react_owner,
      expectedBenefit: 'Reduce React commit latency after ownership (cold start path)',
      risk: 'low',
      complexity: 'medium',
      architectureImpact: 'implementation-only',
    },
    prev_paused_to_react_owner: {
      stage: 'prev_paused_to_react_owner',
      label: STAGE_LABELS.prev_paused_to_react_owner,
      expectedBenefit: 'Reduce React commit → owner cell mount latency',
      risk: 'low',
      complexity: 'medium',
      architectureImpact: 'implementation-only',
    },
    react_owner_to_source_assign: {
      stage: 'react_owner_to_source_assign',
      label: STAGE_LABELS.react_owner_to_source_assign,
      expectedBenefit: 'Faster adapter registration and source handoff after mount',
      risk: 'medium',
      complexity: 'medium',
      architectureImpact: 'implementation-only',
    },
    source_assign_to_load_start: {
      stage: 'source_assign_to_load_start',
      label: STAGE_LABELS.source_assign_to_load_start,
      expectedBenefit: 'Reduce native player cold-start before LOAD_START',
      risk: 'medium',
      complexity: 'high',
      architectureImpact: 'architectural',
    },
    load_start_to_ready: {
      stage: 'load_start_to_ready',
      label: STAGE_LABELS.load_start_to_ready,
      expectedBenefit: 'Faster HLS manifest fetch and player ready signal',
      risk: 'medium',
      complexity: 'high',
      architectureImpact: 'architectural',
    },
    ready_to_first_frame: {
      stage: 'ready_to_first_frame',
      label: STAGE_LABELS.ready_to_first_frame,
      expectedBenefit: 'Reduce decoder init and buffer acquisition before first frame',
      risk: 'high',
      complexity: 'high',
      architectureImpact: 'architectural',
    },
  };

  return stats
    .filter((s) => map[s.stage] != null)
    .sort((a, b) => b.mean - a.mean)
    .map((s) => map[s.stage]!);
}

export function formatTimingTable(stats: StageStats[]): string {
  const header = '| Stage | n | Mean (ms) | Median (ms) | P95 (ms) | Max (ms) |';
  const sep = '|-------|---|-----------|-------------|----------|----------|';
  const rows = stats.map(
    (s) =>
      `| ${s.label} | ${s.count} | ${s.mean.toFixed(1)} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} |`,
  );
  return [header, sep, ...rows].join('\n');
}

export function generateInvestigationReport(sessions: StartupLatencySession[]): string {
  const completed = sessions.filter((s) => s.completedAt != null);
  const stats = aggregateStageStats(completed);
  const ranks = rankContributors(completed);
  const latest = completed.at(-1);
  const opportunities = optimizationOpportunities(stats);

  const dominant = ranks[0];
  const lines: string[] = [
    '# Phase 1A — Startup Latency Investigation Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Sessions analyzed:** ${completed.length}`,
    '',
    '> Evidence-based report from instrumented ownership sessions. No playback behavior was modified.',
    '',
    '## 1. Timeline diagram (latest session)',
    '',
  ];

  if (latest) {
    lines.push('```mermaid');
    lines.push(buildMermaidTimeline(latest));
    lines.push('```');
    lines.push('');
    lines.push('### Event log');
    lines.push('');
    lines.push('| ts | Δprev | Δcommit | kind | postId | gen | adapterId |');
    lines.push('|----|-------|---------|------|--------|-----|-----------|');
    for (const e of latest.events) {
      lines.push(
        `| ${e.ts.toFixed(1)} | ${e.deltaMs?.toFixed(1) ?? '—'} | ${e.deltaFromCommitMs?.toFixed(1) ?? '—'} | ${e.kind} | ${e.postId?.slice(0, 8) ?? '—'} | ${e.ownerGeneration ?? '—'} | ${e.adapterId?.slice(0, 12) ?? '—'} |`,
      );
    }
  } else {
    lines.push('_No completed sessions recorded yet. Run device collection protocol._');
  }

  lines.push('', '## 2. Timing table', '', formatTimingTable(stats), '');

  lines.push('## 3. Dominant latency contributor', '');
  if (dominant) {
    lines.push(
      `**${dominant.label}** accounts for **${dominant.sharePercent.toFixed(1)}%** of mean committed→first_frame startup (mean ${dominant.meanMs.toFixed(1)} ms).`,
    );
  } else {
    lines.push('_Insufficient session data._');
  }

  lines.push('', '## 4. Root-cause ranking (by measured mean share)', '');
  if (ranks.length > 0) {
    lines.push('| Rank | Stage | Mean (ms) | Share (%) |');
    lines.push('|------|-------|-----------|-----------|');
    ranks.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.label} | ${r.meanMs.toFixed(1)} | ${r.sharePercent.toFixed(1)} |`);
    });
  } else {
    lines.push('_No ranked causes — collect sessions first._');
  }

  lines.push('', '## 5. Optimization opportunities (not implemented)', '');
  if (opportunities.length > 0) {
    for (const o of opportunities) {
      lines.push(`### ${o.label}`);
      lines.push(`- **Expected benefit:** ${o.expectedBenefit}`);
      lines.push(`- **Risk:** ${o.risk}`);
      lines.push(`- **Complexity:** ${o.complexity}`);
      lines.push(`- **Architecture impact:** ${o.architectureImpact}`);
      lines.push('');
    }
  } else {
    lines.push('_Opportunities populated after timing data is available._');
  }

  return lines.join('\n');
}
