/**
 * Lexical's markdown exporter (`@lexical/markdown`) preserves whitespace at the
 * inside edge of a formatted run by encoding it as a numeric HTML entity flush
 * against the delimiter — a bold run with a trailing space serializes to
 * `**bold&#32;**`. That round-trips inside Lexical, but the public read view
 * parses with CommonMark (react-markdown), which does not classify an emoji as
 * punctuation. A closing delimiter that carries inside-edge whitespace AND is
 * immediately followed by an emoji is then not "right-flanking", so it fails to
 * close the emphasis and the `**` leaks into the output literally.
 *
 * Match the entities and delimiter, with the emoji — pictographic (🔥) or a
 * regional-indicator flag (🇸🇬) — asserted via lookahead. Keycap digits like
 * `1️⃣` start with an ASCII digit, which is neither pictographic nor a regional
 * indicator, so runs that pair correctly around a keycap are left untouched.
 */
const INSIDE_SPACE_BEFORE_EMOJI_CLOSER =
	/((?:&#\d+;)+)(\*\*\*|___|\*\*|__|~~|\*|_)(?=[\p{Extended_Pictographic}\p{Regional_Indicator}])/gu;

/**
 * Normalizes Lexical-exported markdown so it renders correctly through the
 * public CommonMark reader (react-markdown).
 *
 * Swaps the encoded whitespace to just after the closing emphasis delimiter
 * (`$2$1`) when an emoji follows — the one case where CommonMark's flanking
 * rules drop the emphasis and leak a literal `**`. Now-outside the delimiter,
 * react-markdown decodes the `&#32;` to a space; every other entity is left in
 * place, since a blanket decode would break runs that currently render fine
 * (the trailing `;` keeps end-of-line and punctuation-adjacent closers valid).
 *
 * @param content - Raw markdown from the raffle description field
 * @returns Markdown safe to feed to react-markdown
 */
export function normalizeEditorMarkdown(content: string): string {
	return content.replace(INSIDE_SPACE_BEFORE_EMOJI_CLOSER, '$2$1');
}
