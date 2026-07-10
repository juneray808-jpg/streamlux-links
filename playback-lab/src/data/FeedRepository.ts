import { getSupabase } from './supabase';
import { getFeedSessionId } from './feedSession';
import { isHlsUrl, resolvePosterUrl } from './hlsUrl';
import type { FeedItem, FeedPage, FeedPost, RankedFeedCursor } from './types';

const FIRST_PAGE_SIZE = 50;
const SCROLL_PAGE_SIZE = 18;

const POST_SELECT =
  'id, user_id, video_id, playback_url, thumbnail_url, caption, created_at, status, admin_moderation_hidden, moderation_status, width, height';

type RpcPayload = {
  posts: Array<{ id: string; video_url?: string }>;
  next_cursor: { rank: number; id: string } | null;
};

type PostRow = {
  id: string;
  user_id: string;
  video_id: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  created_at: string;
  status: string | null;
  admin_moderation_hidden?: boolean | null;
  moderation_status?: string | null;
  width?: number | null;
  height?: number | null;
};

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isModerationFeedVisible(m: string | null | undefined): boolean {
  if (m == null || m === '') return true;
  return m === 'approved' || m === 'pending_ai';
}

function mapRow(row: PostRow): FeedPost {
  return {
    id: String(row.id),
    videoId: String(row.video_id ?? row.id),
    userId: String(row.user_id),
    playbackUrl: String(row.playback_url ?? '').trim(),
    thumbnailUrl: row.thumbnail_url?.trim() ?? null,
    caption: row.caption != null ? String(row.caption) : null,
    createdAt: String(row.created_at),
    status:
      row.status === 'processing' || row.status === 'failed' ? row.status : 'ready',
    width: numOrNull(row.width),
    height: numOrNull(row.height),
  };
}

function isFeedable(post: FeedPost, row: PostRow): boolean {
  if (row.admin_moderation_hidden === true) return false;
  if (!isModerationFeedVisible(row.moderation_status ?? null)) return false;
  if (post.status !== 'ready' || !post.playbackUrl) return false;
  return isHlsUrl(post.playbackUrl);
}

function toFeedItem(post: FeedPost): FeedItem {
  return {
    postId: post.id,
    hlsUrl: post.playbackUrl,
    posterUrl: resolvePosterUrl(post.thumbnailUrl, post.playbackUrl),
    caption: post.caption,
    width: post.width,
    height: post.height,
  };
}

async function hydratePostsOrdered(ids: string[]): Promise<FeedItem[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('posts').select(POST_SELECT).in('id', ids);
  if (error) throw error;
  const rows = (data ?? []) as PostRow[];
  const byId = new Map(rows.map((r) => [String(r.id), r]));
  const items: FeedItem[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    const post = mapRow(row);
    if (!isFeedable(post, row)) continue;
    items.push(toFeedItem(post));
  }
  return items;
}

async function legacyExplorePage(page: number): Promise<FeedPage> {
  const supabase = getSupabase();
  const from = page * SCROLL_PAGE_SIZE;
  const to = from + SCROLL_PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .not('playback_url', 'is', null)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as PostRow[];
  const items = rows
    .map((row) => ({ row, post: mapRow(row) }))
    .filter(({ row, post }) => isFeedable(post, row))
    .map(({ post }) => toFeedItem(post));
  return {
    items,
    nextCursor:
      items.length >= SCROLL_PAGE_SIZE ? { legacyPage: page + 1 } : null,
  };
}

/**
 * Read-only explore feed — same ranked RPC contract as StreamLux production.
 */
export async function fetchExploreFeedPage(
  cursor: RankedFeedCursor | null,
): Promise<FeedPage> {
  if (cursor && 'legacyPage' in cursor) {
    return legacyExplorePage(cursor.legacyPage);
  }

  const supabase = getSupabase();
  const isFirst = cursor == null;
  const args =
    cursor != null && 'rank' in cursor
      ? {
          p_limit: SCROLL_PAGE_SIZE,
          p_cursor_rank: cursor.rank,
          p_cursor_id: cursor.id,
          p_feed_session_id: getFeedSessionId(),
        }
      : {
          p_limit: FIRST_PAGE_SIZE,
          p_feed_session_id: getFeedSessionId(),
        };

  const { data, error } = await supabase.rpc('streamlux_feed_explore_ranked', args);
  if (error) {
    const msg = String(error.message ?? '');
    if (/PGRST202|42883|does not exist|schema cache/i.test(msg)) {
      return legacyExplorePage(0);
    }
    throw error;
  }

  const payload = data as RpcPayload;
  const ids = (payload.posts ?? []).map((p) => String(p.id));
  const items = await hydratePostsOrdered(ids);
  const next = payload.next_cursor;
  return {
    items,
    nextCursor: next ? { rank: next.rank, id: String(next.id) } : null,
  };
}
