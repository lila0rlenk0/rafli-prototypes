/**
 * Removes markdown formatting and returns plain text
 * Used for character count validation in forms
 *
 * @param markdown - The markdown string to strip
 * @returns Plain text without markdown formatting
 */
export function stripMarkdown(markdown: string): string {
	if (!markdown) return '';

	let text = markdown;

	// Remove code blocks (```code```)
	text = text.replace(/```[\s\S]*?```/g, '');
	// Remove inline code (`code`)
	text = text.replace(/`[^`]*`/g, '');
	// Remove headers (# ## ### #### ##### ######)
	text = text.replace(/^#{1,6}\s+/gm, '');
	// Remove horizontal rules (--- *** ___)
	text = text.replace(/^[-*_]{3,}\s*$/gm, '');
	// Remove blockquotes (>)
	text = text.replace(/^>\s+/gm, '');
	// Remove list markers (- * +) and numbered lists (1. 2. etc)
	text = text.replace(/^[\s]*[-*+]\s+/gm, '');
	text = text.replace(/^[\s]*\d+\.\s+/gm, '');
	// Remove task list markers (- [ ] - [x])
	text = text.replace(/^[\s]*[-*+]\s+\[[ xX]\]\s+/gm, '');
	// Remove bold (**text** or __text__)
	text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
	text = text.replace(/__([^_]+)__/g, '$1');
	// Remove italic (*text* or _text_)
	text = text.replace(/\*([^*]+)\*/g, '$1');
	text = text.replace(/_([^_]+)_/g, '$1');
	// Remove strikethrough (~~text~~)
	text = text.replace(/~~([^~]+)~~/g, '$1');
	// Remove images ![alt](url)
	text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
	// Remove links [text](url)
	text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
	// Remove reference-style links [text][ref]
	text = text.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
	// Remove reference definitions [ref]: url
	text = text.replace(/^\[[^\]]+\]:\s*.*$/gm, '');
	// Remove HTML tags if any
	text = text.replace(/<[^>]+>/g, '');
	// Remove multiple spaces and normalize whitespace
	text = text.replace(/\s+/g, ' ');
	// Remove leading/trailing whitespace from each line
	text = text
		.split('\n')
		.map(line => line.trim())
		.join('\n');
	// Remove multiple consecutive newlines
	text = text.replace(/\n{3,}/g, '\n\n');
	// Trim final result
	text = text.trim();

	return text;
}
