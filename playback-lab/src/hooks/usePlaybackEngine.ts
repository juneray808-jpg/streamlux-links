import { useSyncExternalStore } from 'react';
import { getPlaybackEngine } from '../playback/PlaybackEngine';
import type { CellUiState, EngineSnapshot } from '../playback/types';

export function usePlaybackEngineSnapshot(): EngineSnapshot {
  const engine = getPlaybackEngine();
  return useSyncExternalStore(engine.subscribe.bind(engine), () => engine.getSnapshot(), () => engine.getSnapshot());
}

export function useCellUiState(postId: string): CellUiState {
  const snapshot = usePlaybackEngineSnapshot();
  return snapshot.getCellUiState(postId);
}

export function useIsPlaybackOwner(postId: string): boolean {
  const snapshot = usePlaybackEngineSnapshot();
  return snapshot.ownerPostId === postId;
}
