import { useMemo, useSyncExternalStore } from 'react';
import { getPlaybackEngine } from '../playback/PlaybackEngine';
import type { CellUiState, EngineSnapshot } from '../playback/types';

const engine = getPlaybackEngine();
const subscribe = (listener: () => void) => engine.subscribe(listener);
const getSnapshot = () => engine.getSnapshot();

export function usePlaybackEngineSnapshot(): EngineSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCellUiState(postId: string): CellUiState {
  const snapshot = usePlaybackEngineSnapshot();
  return useMemo(() => snapshot.getCellUiState(postId), [snapshot, postId]);
}

export function useIsPlaybackOwner(postId: string): boolean {
  const snapshot = usePlaybackEngineSnapshot();
  return snapshot.ownerPostId === postId;
}
