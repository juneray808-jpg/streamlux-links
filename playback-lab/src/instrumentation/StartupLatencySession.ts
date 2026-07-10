import type { InstrumentKind, PlaybackInstrumentEvent } from './types';
import { STARTUP_SESSION_TERMINAL_KINDS } from './types';

export type StartupLatencySession = {
  sessionId: string;
  postId: string;
  ownerGeneration: number;
  startedAt: number;
  committedAt: number | null;
  completedAt: number | null;
  events: PlaybackInstrumentEvent[];
};

type ActiveSession = {
  sessionId: string | null;
  postId: string;
  ownerGeneration: number | null;
  startedAt: number;
  committedAt: number | null;
  lastTs: number;
  events: PlaybackInstrumentEvent[];
};

function makeSessionId(postId: string, ownerGeneration: number): string {
  return `${postId}:${ownerGeneration}`;
}

/**
 * Groups instrumentation into ownership sessions and computes per-event deltas.
 * Session opens on ownership_candidate; commit anchor set on ownership_committed.
 * Instrumentation-only — does not affect playback.
 */
export class StartupLatencySessionTracker {
  private active: ActiveSession | null = null;
  private completed: StartupLatencySession[] = [];
  private readonly maxCompleted: number;

  constructor(maxCompleted = 50) {
    this.maxCompleted = maxCompleted;
  }

  onEvent(
    kind: InstrumentKind,
    fields: Omit<PlaybackInstrumentEvent, 'ts' | 'kind'>,
    ts: number,
  ): Partial<PlaybackInstrumentEvent> {
    const enrich: Partial<PlaybackInstrumentEvent> = {};

    if (kind === 'ownership_candidate' && fields.postId != null) {
      this.openSession(fields.postId, ts);
    }

    if (kind === 'ownership_rejected') {
      this.abandonSession();
      return enrich;
    }

    if (kind === 'ownership_committed' && fields.postId != null && fields.ownerGeneration != null) {
      this.anchorCommit(fields.postId, fields.ownerGeneration, ts);
    }

    if (this.active != null) {
      enrich.deltaMs = ts - this.active.lastTs;

      if (this.active.committedAt != null) {
        enrich.deltaFromCommitMs = ts - this.active.committedAt;
        enrich.msSinceOwnership = enrich.deltaFromCommitMs;
      }

      if (this.active.sessionId != null) {
        enrich.sessionId = this.active.sessionId;
      }
      if (fields.ownerGeneration == null && this.active.ownerGeneration != null) {
        enrich.ownerGeneration = this.active.ownerGeneration;
      }
      if (fields.postId == null) {
        enrich.postId = this.active.postId;
      }
    }

    return enrich;
  }

  recordEvent(event: PlaybackInstrumentEvent): void {
    if (this.active == null) return;

    this.active.events.push(event);
    this.active.lastTs = event.ts;

    if (STARTUP_SESSION_TERMINAL_KINDS.includes(event.kind)) {
      this.completeSession(event.ts);
    }
  }

  private openSession(postId: string, ts: number): void {
    if (this.active != null && this.active.postId === postId) {
      return;
    }
    this.abandonSession();
    this.active = {
      sessionId: null,
      postId,
      ownerGeneration: null,
      startedAt: ts,
      committedAt: null,
      lastTs: ts,
      events: [],
    };
  }

  private anchorCommit(postId: string, ownerGeneration: number, ts: number): void {
    if (this.active == null || this.active.postId !== postId) {
      this.active = {
        sessionId: makeSessionId(postId, ownerGeneration),
        postId,
        ownerGeneration,
        startedAt: ts,
        committedAt: ts,
        lastTs: ts,
        events: [],
      };
      return;
    }

    this.active.sessionId = makeSessionId(postId, ownerGeneration);
    this.active.ownerGeneration = ownerGeneration;
    this.active.committedAt = ts;

    for (const event of this.active.events) {
      event.deltaFromCommitMs = event.ts - ts;
      event.msSinceOwnership = event.deltaFromCommitMs;
    }
  }

  private abandonSession(): void {
    this.active = null;
  }

  private completeSession(completedAt: number): void {
    if (this.active == null || this.active.committedAt == null || this.active.ownerGeneration == null) {
      this.abandonSession();
      return;
    }

    const session: StartupLatencySession = {
      sessionId: this.active.sessionId ?? makeSessionId(this.active.postId, this.active.ownerGeneration),
      postId: this.active.postId,
      ownerGeneration: this.active.ownerGeneration,
      startedAt: this.active.startedAt,
      committedAt: this.active.committedAt,
      completedAt,
      events: [...this.active.events],
    };

    this.completed.push(session);
    if (this.completed.length > this.maxCompleted) {
      this.completed.shift();
    }
    this.active = null;
  }

  getActiveSession(): StartupLatencySession | null {
    if (this.active == null) return null;
    return {
      sessionId: this.active.sessionId ?? 'pending',
      postId: this.active.postId,
      ownerGeneration: this.active.ownerGeneration ?? -1,
      startedAt: this.active.startedAt,
      committedAt: this.active.committedAt,
      completedAt: null,
      events: [...this.active.events],
    };
  }

  getCompletedSessions(): StartupLatencySession[] {
    return [...this.completed];
  }

  getLatestCompletedSession(): StartupLatencySession | null {
    return this.completed.at(-1) ?? null;
  }

  clear(): void {
    this.active = null;
    this.completed.length = 0;
  }
}
