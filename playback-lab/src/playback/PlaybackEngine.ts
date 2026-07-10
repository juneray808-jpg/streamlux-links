import { instrumentationBus } from '../instrumentation/InstrumentationBus';
import { NativePlayerAdapter } from './NativePlayerAdapter';
import type {
  CellUiState,
  EngineSnapshot,
  NativePlayerEvent,
  OwnerPlaybackPhase,
  OwnershipCandidate,
} from './types';
import { VIEWABILITY_COMMIT_THRESHOLD } from './types';

const FIRST_FRAME_PROGRESS_SEC = 0.033;

type OwnerRecord = {
  postId: string;
  index: number;
  hlsUrl: string;
  phase: OwnerPlaybackPhase;
  firstFrameRendered: boolean;
  userPaused: boolean;
  buffering: boolean;
};

type Listener = () => void;

function defaultCellUiState(postId: string): CellUiState {
  return {
    postId,
    isOwner: false,
    phase: 'idle',
    posterVisible: true,
    spinnerVisible: false,
    userPaused: false,
    audioEnabled: false,
    firstFrameRendered: false,
  };
}

function deriveCellUi(owner: OwnerRecord | null, postId: string): CellUiState {
  if (!owner || owner.postId !== postId) {
    return defaultCellUiState(postId);
  }

  const posterVisible = !owner.firstFrameRendered && owner.phase !== 'error';
  const spinnerVisible =
    !owner.firstFrameRendered &&
    (owner.phase === 'loading' || owner.phase === 'buffering');

  return {
    postId,
    isOwner: true,
    phase: owner.phase,
    posterVisible,
    spinnerVisible,
    userPaused: owner.userPaused,
    audioEnabled: !owner.userPaused && owner.phase !== 'error',
    firstFrameRendered: owner.firstFrameRendered,
  };
}

/**
 * Phase 1 — singleton playback authority.
 * Proves deterministic ownership only (no preload / corridor / lifecycle).
 */
class PlaybackEngineImpl {
  private version = 0;
  private listeners = new Set<Listener>();

  private owner: OwnerRecord | null = null;
  private ownerGeneration = 0;
  private adapter: NativePlayerAdapter | null = null;
  private adapterPostId: string | null = null;
  private audibleAdapterId: string | null = null;

  private candidateStartedAt: number | null = null;
  private pendingCandidate: OwnershipCandidate | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): EngineSnapshot {
    const owner = this.owner;
    return {
      version: this.version,
      ownerPostId: owner?.postId ?? null,
      ownerIndex: owner?.index ?? -1,
      ownerGeneration: this.ownerGeneration,
      getCellUiState: (postId: string) => deriveCellUi(owner, postId),
    };
  }

  /** ViewabilityBridge proposes — engine validates and may commit. */
  proposeOwnership(candidate: OwnershipCandidate): void {
    instrumentationBus.emit('ownership_candidate', {
      postId: candidate.postId,
      index: candidate.index,
      meta: {
        visibility: candidate.visibilityPercent,
        source: candidate.source,
      },
    });

    if (candidate.visibilityPercent < VIEWABILITY_COMMIT_THRESHOLD) {
      instrumentationBus.emit('ownership_rejected', {
        postId: candidate.postId,
        index: candidate.index,
        meta: { reason: 'below_commit_threshold' },
      });
      return;
    }

    if (this.owner?.postId === candidate.postId) {
      return;
    }

    if (this.candidateStartedAt == null) {
      this.candidateStartedAt = performance.now();
    }
    this.pendingCandidate = candidate;
    this.commitOwnership(candidate);
  }

  private commitOwnership(candidate: OwnershipCandidate): void {
    const transferStart = this.candidateStartedAt ?? performance.now();
    const previousPostId = this.owner?.postId ?? null;

    this.silenceCurrentAdapter();

    if (previousPostId) {
      instrumentationBus.emit('ownership_released', {
        postId: previousPostId,
        ownerGeneration: this.ownerGeneration,
      });
    }

    this.ownerGeneration += 1;
    this.owner = {
      postId: candidate.postId,
      index: candidate.index,
      hlsUrl: '',
      phase: 'loading',
      firstFrameRendered: false,
      userPaused: false,
      buffering: false,
    };
    this.pendingCandidate = null;
    this.candidateStartedAt = null;

    instrumentationBus.emit('ownership_gained', {
      postId: candidate.postId,
      index: candidate.index,
      ownerGeneration: this.ownerGeneration,
    });

    instrumentationBus.emit('ownership_transfer_ms', {
      postId: candidate.postId,
      index: candidate.index,
      ownerGeneration: this.ownerGeneration,
      meta: { ms: performance.now() - transferStart },
    });

    this.bump();
    this.activateOwnerIfReady();
  }

  setOwnerSource(postId: string, hlsUrl: string): void {
    if (!this.owner || this.owner.postId !== postId) return;
    this.owner.hlsUrl = hlsUrl;
    if (this.adapter && this.adapterPostId === postId) {
      instrumentationBus.emit('source_assign', {
        postId,
        index: this.owner.index,
        ownerGeneration: this.ownerGeneration,
      });
      this.adapter.assignSource(hlsUrl);
      this.applyOwnerPlaybackIntent();
    }
  }

  registerAdapter(postId: string, adapter: NativePlayerAdapter, hlsUrl: string): void {
    adapter.bindEventHandler((event) => this.handleNativeEvent(event));

    if (this.adapter && this.adapterPostId !== postId) {
      this.silenceAdapter(this.adapter);
    }

    this.adapter = adapter;
    this.adapterPostId = postId;

    if (!this.owner || this.owner.postId !== postId) {
      this.silenceAdapter(adapter);
      return;
    }

    this.owner.hlsUrl = hlsUrl;
    instrumentationBus.emit('source_assign', {
      postId,
      index: this.owner.index,
      ownerGeneration: this.ownerGeneration,
    });
    adapter.assignSource(hlsUrl);
    this.applyOwnerPlaybackIntent();
  }

  unregisterAdapter(postId: string): void {
    if (this.adapterPostId === postId) {
      this.silenceAdapter(this.adapter);
      this.adapter = null;
      this.adapterPostId = null;
    }
  }

  toggleUserPause(): void {
    if (!this.owner) return;
    this.owner.userPaused = !this.owner.userPaused;
    if (this.owner.userPaused) {
      instrumentationBus.emit('user_pause', {
        postId: this.owner.postId,
        index: this.owner.index,
        ownerGeneration: this.ownerGeneration,
      });
      this.adapter?.pause();
      this.owner.phase = 'paused';
    } else {
      instrumentationBus.emit('user_resume', {
        postId: this.owner.postId,
        index: this.owner.index,
        ownerGeneration: this.ownerGeneration,
      });
      this.applyOwnerPlaybackIntent();
    }
    this.bump();
  }

  private handleNativeEvent(event: NativePlayerEvent): void {
    if (!this.owner || event.postId !== this.owner.postId) {
      return;
    }

    switch (event.kind) {
      case 'load_start':
        this.owner.phase = 'loading';
        instrumentationBus.emit('native_load_start', {
          postId: event.postId,
          index: this.owner.index,
          ownerGeneration: this.ownerGeneration,
        });
        break;
      case 'ready_for_display':
        instrumentationBus.emit('native_ready', {
          postId: event.postId,
          index: this.owner.index,
          ownerGeneration: this.ownerGeneration,
        });
        break;
      case 'progress':
        if (
          !this.owner.firstFrameRendered &&
          (event.currentTimeSec ?? 0) >= FIRST_FRAME_PROGRESS_SEC
        ) {
          this.markFirstFrame();
        } else if (!this.owner.userPaused && !this.owner.buffering) {
          this.owner.phase = 'playing';
        }
        break;
      case 'buffer':
        this.owner.buffering = true;
        if (!this.owner.firstFrameRendered) {
          this.owner.phase = 'buffering';
        }
        instrumentationBus.emit('native_buffer_start', {
          postId: event.postId,
          index: this.owner.index,
          ownerGeneration: this.ownerGeneration,
        });
        break;
      case 'end_buffer':
        this.owner.buffering = false;
        instrumentationBus.emit('native_buffer_end', {
          postId: event.postId,
          index: this.owner.index,
          ownerGeneration: this.ownerGeneration,
        });
        if (!this.owner.userPaused) {
          this.owner.phase = 'playing';
        }
        break;
      case 'error':
        this.owner.phase = 'error';
        instrumentationBus.emit('native_error', {
          postId: event.postId,
          index: this.owner.index,
          ownerGeneration: this.ownerGeneration,
          meta: { message: event.errorMessage ?? 'unknown' },
        });
        break;
      default:
        break;
    }

    this.bump();
  }

  private markFirstFrame(): void {
    if (!this.owner || this.owner.firstFrameRendered) return;
    this.owner.firstFrameRendered = true;
    instrumentationBus.emit('first_frame', {
      postId: this.owner.postId,
      index: this.owner.index,
      ownerGeneration: this.ownerGeneration,
    });
    instrumentationBus.emit('poster_hidden', {
      postId: this.owner.postId,
      index: this.owner.index,
      ownerGeneration: this.ownerGeneration,
    });
    if (!this.owner.userPaused) {
      this.owner.phase = 'playing';
    }
  }

  private activateOwnerIfReady(): void {
    if (!this.owner || !this.adapter || this.adapterPostId !== this.owner.postId) {
      return;
    }
    if (this.owner.hlsUrl) {
      this.adapter.assignSource(this.owner.hlsUrl);
    }
    this.applyOwnerPlaybackIntent();
  }

  private applyOwnerPlaybackIntent(): void {
    if (!this.owner || !this.adapter) return;

    if (this.owner.userPaused) {
      this.adapter.setVolume(0);
      this.adapter.pause();
      this.owner.phase = 'paused';
      return;
    }

    this.adapter.setVolume(1);
    this.assertSingleAudible(this.adapter.adapterId);
    this.adapter.resume();
    if (!this.owner.firstFrameRendered) {
      this.owner.phase = 'loading';
    } else {
      this.owner.phase = 'playing';
    }
  }

  private silenceCurrentAdapter(): void {
    if (this.adapter) {
      this.silenceAdapter(this.adapter);
    }
  }

  private silenceAdapter(adapter: NativePlayerAdapter | null): void {
    if (!adapter) return;
    adapter.setVolume(0);
    adapter.pause();
    if (this.audibleAdapterId === adapter.adapterId) {
      this.audibleAdapterId = null;
    }
  }

  private assertSingleAudible(adapterId: string): void {
    if (this.audibleAdapterId != null && this.audibleAdapterId !== adapterId) {
      instrumentationBus.emit('audio_overlap', {
        ownerGeneration: this.ownerGeneration,
        meta: {
          previous: this.audibleAdapterId,
          next: adapterId,
        },
      });
    }
    this.audibleAdapterId = adapterId;
  }

  private bump(): void {
    this.version += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

let engineSingleton: PlaybackEngineImpl | null = null;

export function getPlaybackEngine(): PlaybackEngineImpl {
  if (!engineSingleton) {
    engineSingleton = new PlaybackEngineImpl();
  }
  return engineSingleton;
}

/** Test-only reset */
export function resetPlaybackEngineForTests(): void {
  engineSingleton = null;
}

export type PlaybackEngine = PlaybackEngineImpl;
