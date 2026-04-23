/**
 * Video file extensions supported by the raffle media gallery.
 *
 * Primary encoding is MP4 (H.264 baseline) — universal playback without a
 * JS player shim. WebM kept as an acceptable fallback extension for future
 * AV1/VP9 siblings. `.mov` allowed because some raw source files may be
 * served pre-transcode during internal testing.
 */
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'] as const;

// Hoisted — constructing a RegExp on every call costs a dozen microseconds,
// and this runs in a loop over gallery items. Module-level keeps the object
// alive for the lifetime of the module (cheap).
const QUERY_OR_HASH_RE = /[?#]/;
const TRAILING_EXTENSION_RE = /\.[a-z0-9]+$/i;

/**
 * Maps a video URL extension to the corresponding MIME type.
 *
 * Used to populate `<source type>` attributes — browsers skip sources
 * whose declared type they can't play without issuing a network request,
 * which is both faster (no round-trip) and cheaper (no bandwidth) than
 * letting the `<video>` element probe via HTTP HEAD.
 */
const VIDEO_MIME_BY_EXT: Record<string, string> = {
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mov': 'video/quicktime',
	'.m4v': 'video/x-m4v',
};

/**
 * Detects a video by URL extension, ignoring query string and hash.
 *
 * Matching on extension (not MIME) because gallery URLs come from the
 * backend as opaque CDN strings — we don't receive a content-type until
 * the browser fetches. Extension is stable, server-controlled, and
 * sufficient to branch between `<video>` and `<Image>` at render time.
 *
 * @returns true when the URL's pathname ends with a known video extension
 */
export function isVideoUrl(url: string): boolean {
	const pathname = url.split('?')[0].split('#')[0].toLowerCase();
	return VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

/**
 * Discriminated media item used across the raffle gallery surface.
 *
 * Cover images always resolve to `image`. Gallery entries are classified
 * via {@link isVideoUrl}. Keeping this shape here (not in types/) because
 * it's a pure render concern — never sent over the network, never persisted.
 */
export type RaffleMediaItem =
	| { type: 'image'; url: string }
	| { type: 'video'; url: string };

/**
 * Classifies a URL into a {@link RaffleMediaItem} discriminated union.
 *
 * @returns video item when URL has a video extension, image otherwise
 */
export function toMediaItem(url: string): RaffleMediaItem {
	return isVideoUrl(url) ? { type: 'video', url } : { type: 'image', url };
}

/**
 * Derives a thumbnail JPG URL from a video URL by convention.
 *
 * Upload pipeline produces sibling thumbnail artifacts: `clip.mp4` → `clip-thumbnail.jpg`.
 * Used to paint a cheap preview in gallery tiles + give the carousel/lightbox
 * something to show before video metadata arrives — critical on mobile data
 * where `preload="metadata"` per-tile costs tens of KB × N items.
 *
 * @returns derived thumbnail URL, or null when the input is not a recognized video
 */
export function getVideoThumbnailUrl(videoUrl: string): null | string {
	if (!isVideoUrl(videoUrl)) return null;
	const queryIndex = videoUrl.search(QUERY_OR_HASH_RE);
	const path = queryIndex === -1 ? videoUrl : videoUrl.slice(0, queryIndex);
	const suffix = queryIndex === -1 ? '' : videoUrl.slice(queryIndex);
	// Strip the last extension segment regardless of case, keeping query/hash.
	const withoutExt = path.replace(TRAILING_EXTENSION_RE, '');
	return `${withoutExt}-thumbnail.jpg${suffix}`;
}

/**
 * Returns the video MIME type for a URL based on its extension, or null
 * when the URL isn't a recognized video.
 *
 * Used for the `type` attribute on `<source>` — omitting this forces the
 * browser to HEAD the URL before deciding if it can play, which costs a
 * round-trip on every video render.
 *
 * @returns MIME string (e.g. `"video/mp4"`) or null when not a video
 */
export function getVideoMimeType(videoUrl: string): null | string {
	if (!isVideoUrl(videoUrl)) return null;
	const queryIndex = videoUrl.search(QUERY_OR_HASH_RE);
	const path = queryIndex === -1 ? videoUrl : videoUrl.slice(0, queryIndex);
	const match = path.toLowerCase().match(TRAILING_EXTENSION_RE);
	if (!match) return null;
	return VIDEO_MIME_BY_EXT[match[0]] ?? null;
}
