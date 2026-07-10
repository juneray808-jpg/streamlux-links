export type PostStatus = 'processing' | 'ready' | 'failed';

/** Minimal `public.posts` row for Playback Lab feed (read-only). */
export type FeedPost = {
  id: string;
  videoId: string;
  userId: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  createdAt: string;
  status: PostStatus;
  width: number | null;
  height: number | null;
};

/** UI-facing item after eligibility filter and URL resolution. */
export type FeedItem = {
  postId: string;
  hlsUrl: string;
  posterUrl: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};

export type RankedFeedCursor =
  | { rank: number; id: string }
  | { legacyPage: number };

export type FeedPage = {
  items: FeedItem[];
  nextCursor: RankedFeedCursor | null;
};
