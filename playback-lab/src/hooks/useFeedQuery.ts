import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchExploreFeedPage } from '../data/FeedRepository';
import { getFeedSessionId } from '../data/feedSession';
import type { FeedItem, RankedFeedCursor } from '../data/types';

export const feedQueryKey = ['playback-lab', 'explore', getFeedSessionId()] as const;

export function useFeedQuery() {
  return useInfiniteQuery({
    queryKey: feedQueryKey,
    initialPageParam: null as RankedFeedCursor | null,
    queryFn: ({ pageParam }) => fetchExploreFeedPage(pageParam),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function flattenFeedPages(
  pages: Array<{ items: FeedItem[] }> | undefined,
): FeedItem[] {
  if (!pages) return [];
  const seen = new Set<string>();
  const out: FeedItem[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.postId)) continue;
      seen.add(item.postId);
      out.push(item);
    }
  }
  return out;
}
