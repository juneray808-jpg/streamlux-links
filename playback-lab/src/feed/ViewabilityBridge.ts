import type { ViewToken } from '@shopify/flash-list';
import { useCallback, useMemo, useRef } from 'react';
import type { ViewabilityConfig } from 'react-native';
import type { FeedItem } from '../data/types';
import { getPlaybackEngine } from '../playback/PlaybackEngine';
import type { OwnershipCandidate } from '../playback/types';
import {
  VIEWABILITY_COMMIT_THRESHOLD,
  VIEWABILITY_PROPOSAL_THRESHOLD,
} from '../playback/types';

export type ViewabilityPolicy = {
  proposalThreshold: number;
  commitThreshold: number;
};

export const DEFAULT_VIEWABILITY_POLICY: ViewabilityPolicy = {
  proposalThreshold: VIEWABILITY_PROPOSAL_THRESHOLD,
  commitThreshold: VIEWABILITY_COMMIT_THRESHOLD,
};

/**
 * Select the best ownership candidate from FlashList viewability tokens.
 * FlashList v2 exposes `isViewable` against `viewabilityConfig.itemVisiblePercentThreshold`.
 */
export function selectOwnershipCandidate(
  viewableItems: ReadonlyArray<ViewToken<FeedItem>>,
  source: OwnershipCandidate['source'],
  policy: ViewabilityPolicy = DEFAULT_VIEWABILITY_POLICY,
): OwnershipCandidate | null {
  let best: OwnershipCandidate | null = null;

  for (const token of viewableItems) {
    if (!token.isViewable || token.item == null) continue;

    // v2 ViewToken has no percentVisible — treat viewable items as meeting commit threshold.
    const candidate: OwnershipCandidate = {
      postId: token.item.postId,
      index: token.index ?? 0,
      visibilityPercent: policy.commitThreshold,
      source,
    };

    if (
      best == null ||
      candidate.index < best.index
    ) {
      best = candidate;
    }
  }

  return best;
}

/**
 * FlashList → ViewabilityBridge → PlaybackEngine (propose only).
 * Phase 1: no scroll-end duplicate paths beyond settle confirmation.
 */
export function useViewabilityBridge(policy: ViewabilityPolicy = DEFAULT_VIEWABILITY_POLICY) {
  const engine = useMemo(() => getPlaybackEngine(), []);
  const rafRef = useRef<number | null>(null);

  const proposeFromTokens = useCallback(
    (viewableItems: ViewToken<FeedItem>[], source: OwnershipCandidate['source']) => {
      const candidate = selectOwnershipCandidate(viewableItems, source, policy);
      if (!candidate) return;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        engine.proposeOwnership(candidate);
      });
    },
    [engine, policy],
  );

  const viewabilityConfig = useMemo<ViewabilityConfig>(
    () => ({
      itemVisiblePercentThreshold: Math.round(policy.commitThreshold * 100),
      minimumViewTime: 0,
    }),
    [policy],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
      proposeFromTokens(viewableItems, 'viewability');
    },
    [proposeFromTokens],
  );

  const onScrollSettled = useCallback(
    (viewableItems: ViewToken<FeedItem>[]) => {
      proposeFromTokens(viewableItems, 'scroll_settle');
    },
    [proposeFromTokens],
  );

  return {
    viewabilityConfig,
    onViewableItemsChanged,
    onScrollSettled,
  };
}
