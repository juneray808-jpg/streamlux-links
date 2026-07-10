/** Phase 1A — canonical startup latency timeline events. */
export type InstrumentKind =
  | 'ownership_candidate'
  | 'ownership_validated'
  | 'ownership_rejected'
  | 'ownership_committed'
  | 'ownership_gained'
  | 'ownership_released'
  | 'ownership_transfer_ms'
  | 'previous_owner_muted'
  | 'previous_owner_paused'
  | 'react_cell_becomes_owner'
  | 'source_assign'
  | 'native_load_start'
  | 'native_ready'
  | 'native_buffer_start'
  | 'native_buffer_end'
  | 'first_frame'
  | 'poster_hidden'
  | 'audio_enabled'
  | 'user_pause'
  | 'user_resume'
  | 'native_error'
  | 'audio_overlap'
  | 'ownership_violation';

export type PlaybackInstrumentEvent = {
  /** Monotonic timestamp (performance.now()). */
  ts: number;
  kind: InstrumentKind;
  postId?: string;
  index?: number;
  ownerGeneration?: number;
  adapterId?: string;
  /** Milliseconds since the previous event in this ownership session. */
  deltaMs?: number;
  /** Milliseconds since ownership_committed for this session. */
  deltaFromCommitMs?: number;
  /** @deprecated Use deltaFromCommitMs — kept for overlay compatibility. */
  msSinceOwnership?: number | null;
  sessionId?: string;
  meta?: Record<string, string | number | boolean>;
};

/** Events that close a Phase 1A ownership session (first rendered frame). */
export const STARTUP_SESSION_TERMINAL_KINDS: readonly InstrumentKind[] = [
  'first_frame',
  'poster_hidden',
] as const;
