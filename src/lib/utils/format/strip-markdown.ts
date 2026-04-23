/**
 * Removes markdown formatting and returns plain text.
 * Used for character count validation in forms.
 */

// Hoisted RegExp patterns — avoid re-creation on every call
const RE_CODE_BLOCK = /```[\s\S]*?```/g;
const RE_INLINE_CODE = /`[^`]*`/g;
const RE_HEADERS = /^#{1,6}\s+/gm;
const RE_HORIZONTAL_RULES = /^[-*_]{3,}\s*$/gm;
const RE_BLOCKQUOTES = /^>\s+/gm;
const RE_UNORDERED_LIST = /^[\s]*[-*+]\s+/gm;
const RE_ORDERED_LIST = /^[\s]*\d+\.\s+/gm;
const RE_TASK_LIST = /^[\s]*[-*+]\s+\[[ xX]\]\s+/gm;
const RE_BOLD_ASTERISK = /\*\*([^*]+)\*\*/g;
const RE_BOLD_UNDERSCORE = /__([^_]+)__/g;
const RE_ITALIC_ASTERISK = /\*([^*]+)\*/g;
const RE_ITALIC_UNDERSCORE = /_([^_]+)_/g;
const RE_STRIKETHROUGH = /~~([^~]+)~~/g;
const RE_IMAGES = /!\[([^\]]*)\]\([^)]*\)/g;
const RE_INLINE_LINKS = /\[([^\]]+)\]\([^)]*\)/g;
const RE_REF_LINKS = /\[([^\]]+)\]\[[^\]]*\]/g;
const RE_REF_DEFINITIONS = /^\[[^\]]+\]:\s*.*$/gm;
const RE_HTML_TAGS = /<[^>]+>/g;
const RE_MULTIPLE_SPACES = /\s+/g;
const RE_MULTIPLE_NEWLINES = /\n{3,}/g;

/**
 * Strips all markdown formatting from a string.
 *
 * @param markdown - The markdown string to strip
 * @returns Plain text without markdown formatting
 */
export function stripMarkdown(markdown: string): string {
	if (!markdown) return '';

	let text = markdown;

	// Step 1: Remove block-level structures (code blocks, headers, rules, quotes, lists).
	text = text.replace(RE_CODE_BLOCK, '');
	text = text.replace(RE_INLINE_CODE, '');
	text = text.replace(RE_HEADERS, '');
	text = text.replace(RE_HORIZONTAL_RULES, '');
	text = text.replace(RE_BLOCKQUOTES, '');
	text = text.replace(RE_UNORDERED_LIST, '');
	text = text.replace(RE_ORDERED_LIST, '');
	text = text.replace(RE_TASK_LIST, '');

	// Step 2: Unwrap inline formatting (bold, italic, strikethrough) — keep inner text.
	text = text.replace(RE_BOLD_ASTERISK, '$1');
	text = text.replace(RE_BOLD_UNDERSCORE, '$1');
	text = text.replace(RE_ITALIC_ASTERISK, '$1');
	text = text.replace(RE_ITALIC_UNDERSCORE, '$1');
	text = text.replace(RE_STRIKETHROUGH, '$1');

	// Step 3: Unwrap links/images — keep alt text or link text, discard URLs.
	text = text.replace(RE_IMAGES, '$1');
	text = text.replace(RE_INLINE_LINKS, '$1');
	text = text.replace(RE_REF_LINKS, '$1');
	text = text.replace(RE_REF_DEFINITIONS, '');

	// Step 4: Strip remaining HTML tags and normalize whitespace.
	text = text.replace(RE_HTML_TAGS, '');
	text = text.replace(RE_MULTIPLE_SPACES, ' ');
	text = text
		.split('\n')
		.map(line => line.trim())
		.join('\n');
	text = text.replace(RE_MULTIPLE_NEWLINES, '\n\n');
	text = text.trim();

	return text;
}
