import { StartupLatencySessionTracker } from './StartupLatencySession';
import type { InstrumentKind, PlaybackInstrumentEvent } from './types';
import type { StartupLatencySession } from './StartupLatencySession';

const MAX_EVENTS = 2000;

type Listener = (event: PlaybackInstrumentEvent) => void;

class InstrumentationBusImpl {
  private readonly ring: PlaybackInstrumentEvent[] = [];
  private listeners = new Set<Listener>();
  private readonly sessionTracker = new StartupLatencySessionTracker();

  emit(
    kind: InstrumentKind,
    fields: Omit<PlaybackInstrumentEvent, 'ts' | 'kind' | 'deltaMs' | 'deltaFromCommitMs' | 'sessionId'> = {},
  ): PlaybackInstrumentEvent {
    const ts = performance.now();
    const sessionEnrich = this.sessionTracker.onEvent(kind, fields, ts);

    const event: PlaybackInstrumentEvent = {
      ts,
      kind,
      ...fields,
      ...sessionEnrich,
    };

    this.sessionTracker.recordEvent(event);

    this.ring.push(event);
    if (this.ring.length > MAX_EVENTS) {
      this.ring.shift();
    }

    for (const listener of this.listeners) {
      listener(event);
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        `[PlaybackLab] ${kind}`,
        `+${event.deltaMs?.toFixed(1) ?? '?'}ms`,
        `commit+${event.deltaFromCommitMs?.toFixed(1) ?? '?'}`,
        event,
      );
    }

    return event;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecent(count = 5): PlaybackInstrumentEvent[] {
    return this.ring.slice(-count);
  }

  getAll(): PlaybackInstrumentEvent[] {
    return [...this.ring];
  }

  countKind(kind: InstrumentKind): number {
    return this.ring.filter((e) => e.kind === kind).length;
  }

  getActiveStartupSession(): StartupLatencySession | null {
    return this.sessionTracker.getActiveSession();
  }

  getCompletedStartupSessions(): StartupLatencySession[] {
    return this.sessionTracker.getCompletedSessions();
  }

  getLatestCompletedStartupSession(): StartupLatencySession | null {
    return this.sessionTracker.getLatestCompletedSession();
  }

  exportStartupSessionsJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        active: this.sessionTracker.getActiveSession(),
        completed: this.sessionTracker.getCompletedSessions(),
        events: this.getAll(),
      },
      null,
      2,
    );
  }

  clear(): void {
    this.ring.length = 0;
    this.sessionTracker.clear();
  }
}

export const instrumentationBus = new InstrumentationBusImpl();
