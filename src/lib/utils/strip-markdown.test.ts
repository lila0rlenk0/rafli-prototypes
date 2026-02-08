import { describe, expect, test } from 'bun:test';
import { stripMarkdown } from './strip-markdown';

describe('stripMarkdown', () => {
	test('returns empty string for empty input', () => {
		expect(stripMarkdown('')).toBe('');
	});

	test('returns empty string for null/undefined-like input', () => {
		expect(stripMarkdown(null as unknown as string)).toBe('');
		expect(stripMarkdown(undefined as unknown as string)).toBe('');
	});

	test('removes headers', () => {
		expect(stripMarkdown('# Header 1')).toBe('Header 1');
		expect(stripMarkdown('## Header 2')).toBe('Header 2');
		expect(stripMarkdown('### Header 3')).toBe('Header 3');
		expect(stripMarkdown('###### Header 6')).toBe('Header 6');
	});

	test('removes bold formatting', () => {
		expect(stripMarkdown('**bold text**')).toBe('bold text');
		expect(stripMarkdown('__bold text__')).toBe('bold text');
	});

	test('removes italic formatting', () => {
		expect(stripMarkdown('*italic text*')).toBe('italic text');
		expect(stripMarkdown('_italic text_')).toBe('italic text');
	});

	test('removes strikethrough', () => {
		expect(stripMarkdown('~~strikethrough~~')).toBe('strikethrough');
	});

	test('removes inline code', () => {
		expect(stripMarkdown('some `code` here')).toBe('some here');
	});

	test('removes code blocks', () => {
		const markdown = '```js\nconst x = 1;\n```';
		expect(stripMarkdown(markdown)).toBe('');
	});

	test('removes links but keeps text', () => {
		expect(stripMarkdown('[link text](https://example.com)')).toBe('link text');
	});

	test('removes images but keeps alt text', () => {
		expect(stripMarkdown('![alt text](image.png)')).toBe('alt text');
	});

	test('removes list markers', () => {
		expect(stripMarkdown('- item 1')).toBe('item 1');
		expect(stripMarkdown('* item 2')).toBe('item 2');
		expect(stripMarkdown('+ item 3')).toBe('item 3');
		expect(stripMarkdown('1. numbered item')).toBe('numbered item');
	});

	test('removes blockquotes', () => {
		expect(stripMarkdown('> quoted text')).toBe('quoted text');
	});

	test('removes horizontal rules', () => {
		expect(stripMarkdown('---')).toBe('');
		expect(stripMarkdown('***')).toBe('');
		expect(stripMarkdown('___')).toBe('');
	});

	test('removes HTML tags', () => {
		expect(stripMarkdown('<div>content</div>')).toBe('content');
		expect(stripMarkdown('<br/>')).toBe('');
	});

	test('handles complex markdown', () => {
		const markdown = `# Title

**Bold** and *italic* text with a [link](url).

- List item 1
- List item 2

> A quote

\`\`\`
code block
\`\`\``;
		const result = stripMarkdown(markdown);
		expect(result).not.toContain('#');
		expect(result).not.toContain('**');
		expect(result).not.toContain('*');
		expect(result).not.toContain('[');
		expect(result).not.toContain('```');
		expect(result).toContain('Title');
		expect(result).toContain('Bold');
		expect(result).toContain('italic');
		expect(result).toContain('link');
	});

	test('normalizes whitespace', () => {
		expect(stripMarkdown('too    many   spaces')).toBe('too many spaces');
	});

	test('trims result', () => {
		expect(stripMarkdown('  text  ')).toBe('text');
	});
});
