export type InstrumentKind =
  | 'ownership_candidate'
  | 'ownership_rejected'
  | 'ownership_gained'
  | 'ownership_released'
  | 'ownership_transfer_ms'
  | 'source_assign'
  | 'native_load_start'
  | 'native_ready'
  | 'first_frame'
  | 'poster_hidden'
  | 'user_pause'
  | 'user_resume'
  | 'native_buffer_start'
  | 'native_buffer_end'
  | 'native_error'
  | 'audio_overlap'
  | 'ownership_violation';

export type PlaybackInstrumentEvent = {
  ts: number;
  kind: InstrumentKind;
  postId?: string;
  index?: number;
  ownerGeneration?: number;
  msSinceOwnership?: number | null;
  meta?: Record<string, string | number | boolean>;
};
