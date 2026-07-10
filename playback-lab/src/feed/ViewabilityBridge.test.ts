import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ViewToken } from '@shopify/flash-list';
import { selectOwnershipCandidate } from './ViewabilityBridge';
import type { FeedItem } from '../data/types';

function token(postId: string, index: number, viewable: boolean): ViewToken<FeedItem> {
  return {
    item: {
      postId,
      hlsUrl: 'https://example.com/v.m3u8',
      posterUrl: null,
      caption: null,
      width: null,
      height: null,
    },
    key: postId,
    index,
    isViewable: viewable,
    timestamp: Date.now(),
  };
}

describe('selectOwnershipCandidate', () => {
  it('returns null when nothing viewable', () => {
    const result = selectOwnershipCandidate([token('a', 0, false)], 'viewability');
    assert.equal(result, null);
  });

  it('picks lowest index among viewable items', () => {
    const result = selectOwnershipCandidate(
      [token('a', 0, true), token('b', 1, true)],
      'viewability',
    );
    assert.equal(result?.postId, 'a');
    assert.equal(result?.index, 0);
    assert.equal(result?.visibilityPercent, 0.8);
  });
});
