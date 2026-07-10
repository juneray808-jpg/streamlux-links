import { Platform } from 'react-native';

const M3U8_INLINE = /\.m3u8(\?|#|$)/i;

function pathOnlyLower(u: string): string {
  const noHash = u.split('#')[0] ?? u;
  return (noHash.split('?')[0] ?? noHash).toLowerCase();
}

export function isHlsUrl(uri: string | null | undefined): boolean {
  const s = String(uri ?? '').trim();
  if (!s) return false;
  if (pathOnlyLower(s).endsWith('.m3u8')) return true;
  return M3U8_INLINE.test(s);
}

export type AvVideoSource = { uri: string; overrideFileExtensionAndroid?: string };

export function toAvVideoSource(uri: string | null | undefined): AvVideoSource {
  const u = String(uri ?? '').trim();
  if (!u) return { uri: '' };
  const out: AvVideoSource = { uri: u };
  if (Platform.OS === 'android' && isHlsUrl(u)) {
    out.overrideFileExtensionAndroid = 'm3u8';
  }
  return out;
}

export function cloudflareThumbnailFromPlaybackUrl(
  playbackUrl: string,
  height = 720,
): string | null {
  const m = playbackUrl.match(/videodelivery\.net\/([0-9a-f-]{8,})/i);
  if (!m?.[1]) return null;
  return `https://videodelivery.net/${m[1]}/thumbnails/thumbnail.jpg?time=1s&height=${height}`;
}

export function resolvePosterUrl(
  thumbnailUrl: string | null | undefined,
  playbackUrl: string,
): string | null {
  const thumb = String(thumbnailUrl ?? '').trim();
  if (thumb) return thumb;
  return cloudflareThumbnailFromPlaybackUrl(playbackUrl);
}
