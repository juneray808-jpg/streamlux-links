/** Phase 1 — owner cell playback phase (engine authority only). */
export type OwnerPlaybackPhase =
  | 'idle'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'error';

export type OwnershipCandidate = {
  postId: string;
  index: number;
  visibilityPercent: number;
  source: 'viewability' | 'scroll_settle';
};

export type NativePlayerEventKind =
  | 'load_start'
  | 'ready_for_display'
  | 'progress'
  | 'buffer'
  | 'end_buffer'
  | 'error';

export type NativePlayerEvent = {
  kind: NativePlayerEventKind;
  postId: string;
  currentTimeSec?: number;
  errorMessage?: string;
};

/** Derived UI slice per post — cells reflect only; never decide playback. */
export type CellUiState = {
  postId: string;
  isOwner: boolean;
  phase: OwnerPlaybackPhase;
  posterVisible: boolean;
  spinnerVisible: boolean;
  userPaused: boolean;
  audioEnabled: boolean;
  firstFrameRendered: boolean;
};

export type EngineSnapshot = {
  version: number;
  ownerPostId: string | null;
  ownerIndex: number;
  ownerGeneration: number;
  getCellUiState: (postId: string) => CellUiState;
};

export const VIEWABILITY_PROPOSAL_THRESHOLD = 0.5;
export const VIEWABILITY_COMMIT_THRESHOLD = 0.8;
