'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_CRITICAL, FORMAT_TEXT_COMMAND } from 'lexical';
import { useEffect } from 'react';

/**
 * Blocks the underline text format inside the raffle-description editor.
 *
 * The toolbar deliberately omits an underline button, but core Lexical still
 * binds ⌘/Ctrl+U to `FORMAT_TEXT_COMMAND('underline')`. Underline has no
 * Markdown representation and no configured transformer, so
 * `$convertToMarkdownString` silently drops it on save — the host applies it,
 * sees it live, then it vanishes in the published view. Consuming the command
 * at critical priority closes that remaining path.
 *
 * @returns null — behavior-only plugin, renders nothing
 */
export function BlockUnderlinePlugin() {
	const [editor] = useLexicalComposerContext();

	// mount: intercept the underline format command for the editor's lifetime.
	// Returning true for the 'underline' payload stops propagation to Lexical's
	// default formatter; every other format falls through untouched.
	useEffect(() => {
		return editor.registerCommand(
			FORMAT_TEXT_COMMAND,
			payload => payload === 'underline',
			COMMAND_PRIORITY_CRITICAL,
		);
	}, [editor]);

	return null;
}
