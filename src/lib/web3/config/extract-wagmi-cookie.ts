/**
 * wagmi's default storage key prefix (`createStorage({ key: 'wagmi' })`) plus
 * the internal `.store` suffix wagmi appends when persisting connection state.
 * Matches `cookieToInitialState`'s lookup key so the server→client handoff
 * stays consistent without importing wagmi internals here.
 */
const WAGMI_STORE_KEY = 'wagmi.store';

/**
 * Extracts only the wagmi connection cookie from a raw request `Cookie`
 * header, returning a single-entry cookie string suitable for
 * `cookieToInitialState(wagmiConfig, value)`.
 *
 * Security rationale: the raffle-detail segment layout
 * (`app/(public)/browse/[publicSlug]/layout.tsx`) forwards this value across
 * the Server→Client boundary so wagmi can seed SSR state. Props crossing
 * that boundary are serialized into the RSC flight payload and embedded in
 * the initial HTML (`self.__next_f.push(...)`) where any script on the page
 * can read them. Forwarding the raw `Cookie` header would expose the
 * `httpOnly` session JWT (`raffly-token`) to client JavaScript, defeating
 * its httpOnly protection. Scoping to `wagmi.store` whitelists the only
 * cookie wagmi actually needs and keeps auth material off the wire.
 *
 * Tolerates both `; ` (spec) and `;` (some clients) separators. Returns
 * `null` when the header is missing or no wagmi entry is present — callers
 * should treat that as "no hydrated wallet state" and proceed.
 *
 * @param cookieHeader - Raw `Cookie` request header from `headers().get('cookie')`
 * @returns `wagmi.store=<serialized-state>` string, or `null` when absent
 */
export function extractWagmiCookie(
	cookieHeader: string | null | undefined,
): string | null {
	if (!cookieHeader) return null;

	for (const rawEntry of cookieHeader.split(';')) {
		const entry = rawEntry.trim();
		if (!entry.startsWith(`${WAGMI_STORE_KEY}=`)) continue;

		// wagmi's `cookieStorage.setItem` writes the serialized state directly
		// into `document.cookie` without URL-encoding, but Safari and some
		// other browsers percent-encode reserved cookie chars (`{`, `"`, `,`)
		// on persist. The request `Cookie` header then echoes that encoded
		// form, and wagmi's `cookieToInitialState` feeds the substring to
		// `JSON.parse` unchanged — so `%7B%22state…` throws
		// `Unexpected token '%'`. Decoding here makes hydration tolerant of
		// both raw and percent-encoded cookie values without patching wagmi.
		const rawValue = entry.substring(WAGMI_STORE_KEY.length + 1);
		const decodedValue = safeDecode(rawValue);
		return `${WAGMI_STORE_KEY}=${decodedValue}`;
	}

	return null;
}

/**
 * `decodeURIComponent` throws on malformed escape sequences (e.g. a stray `%`
 * that isn't followed by two hex digits). A malformed wagmi cookie shouldn't
 * crash SSR — fall back to the raw value so wagmi can surface its own
 * deserialize error (or return `undefined` initial state) downstream.
 */
function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
