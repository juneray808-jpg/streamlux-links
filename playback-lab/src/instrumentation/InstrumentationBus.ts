import type { InstrumentKind, PlaybackInstrumentEvent } from './types';

const MAX_EVENTS = 500;

type Listener = (event: PlaybackInstrumentEvent) => void;

class InstrumentationBusImpl {
  private readonly ring: PlaybackInstrumentEvent[] = [];
  private listeners = new Set<Listener>();
  private ownershipGainedAt = new Map<string, number>();

  emit(
    kind: InstrumentKind,
    fields: Omit<PlaybackInstrumentEvent, 'ts' | 'kind'> = {},
  ): PlaybackInstrumentEvent {
    const event: PlaybackInstrumentEvent = {
      ts: performance.now(),
      kind,
      ...fields,
    };

    if (kind === 'ownership_gained' && fields.postId) {
      this.ownershipGainedAt.set(fields.postId, event.ts);
    }
    if (kind === 'ownership_released' && fields.postId) {
      this.ownershipGainedAt.delete(fields.postId);
    }

    if (fields.ownerGeneration != null && fields.postId) {
      const gained = this.ownershipGainedAt.get(fields.postId);
      event.msSinceOwnership = gained != null ? event.ts - gained : null;
    }

    this.ring.push(event);
    if (this.ring.length > MAX_EVENTS) {
      this.ring.shift();
    }

    for (const listener of this.listeners) {
      listener(event);
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[PlaybackLab] ${kind}`, event);
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

  clear(): void {
    this.ring.length = 0;
    this.ownershipGainedAt.clear();
  }
}

export const instrumentationBus = new InstrumentationBusImpl();
