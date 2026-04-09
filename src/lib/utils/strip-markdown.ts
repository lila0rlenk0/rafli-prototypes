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

	// Remove code blocks (```code```)
	text = text.replace(RE_CODE_BLOCK, '');
	// Remove inline code (`code`)
	text = text.replace(RE_INLINE_CODE, '');
	// Remove headers (# ## ### #### ##### ######)
	text = text.replace(RE_HEADERS, '');
	// Remove horizontal rules (--- *** ___)
	text = text.replace(RE_HORIZONTAL_RULES, '');
	// Remove blockquotes (>)
	text = text.replace(RE_BLOCKQUOTES, '');
	// Remove list markers (- * +) and numbered lists (1. 2. etc)
	text = text.replace(RE_UNORDERED_LIST, '');
	text = text.replace(RE_ORDERED_LIST, '');
	// Remove task list markers (- [ ] - [x])
	text = text.replace(RE_TASK_LIST, '');
	// Remove bold (**text** or __text__)
	text = text.replace(RE_BOLD_ASTERISK, '$1');
	text = text.replace(RE_BOLD_UNDERSCORE, '$1');
	// Remove italic (*text* or _text_)
	text = text.replace(RE_ITALIC_ASTERISK, '$1');
	text = text.replace(RE_ITALIC_UNDERSCORE, '$1');
	// Remove strikethrough (~~text~~)
	text = text.replace(RE_STRIKETHROUGH, '$1');
	// Remove images ![alt](url)
	text = text.replace(RE_IMAGES, '$1');
	// Remove links [text](url)
	text = text.replace(RE_INLINE_LINKS, '$1');
	// Remove reference-style links [text][ref]
	text = text.replace(RE_REF_LINKS, '$1');
	// Remove reference definitions [ref]: url
	text = text.replace(RE_REF_DEFINITIONS, '');
	// Remove HTML tags if any
	text = text.replace(RE_HTML_TAGS, '');
	// Remove multiple spaces and normalize whitespace
	text = text.replace(RE_MULTIPLE_SPACES, ' ');
	// Remove leading/trailing whitespace from each line
	text = text
		.split('\n')
		.map(line => line.trim())
		.join('\n');
	// Remove multiple consecutive newlines
	text = text.replace(RE_MULTIPLE_NEWLINES, '\n\n');
	// Trim final result
	text = text.trim();

	return text;
}
