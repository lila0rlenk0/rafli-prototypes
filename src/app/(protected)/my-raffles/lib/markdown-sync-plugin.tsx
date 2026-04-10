'use client';

import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	CHECK_LIST,
	ELEMENT_TRANSFORMERS,
	MULTILINE_ELEMENT_TRANSFORMERS,
	TEXT_FORMAT_TRANSFORMERS,
	TEXT_MATCH_TRANSFORMERS,
} from '@lexical/markdown';
import { CodeNode } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot } from 'lexical';
import { useEffect, useRef } from 'react';

import { useTimeout } from '@/lib/hooks/use-timeout';

/**
 * Shape of a Lexical markdown transformer we care about for filtering.
 * Only the fields we inspect are listed — Lexical's real transformer union
 * is broader, but this minimal shape keeps the filter helper strict without
 * re-declaring the library's internal types.
 */
type InspectableTransformer = {
	readonly dependencies?: readonly unknown[];
	readonly regExp?: RegExp;
};

/**
 * Detects whether a Lexical markdown transformer depends on CodeNode.
 *
 * Why this exists: the editor config does not register CodeNode (code blocks
 * are intentionally out of scope for raffle descriptions), but Lexical's
 * default transformer arrays include code-related ones. Registering a
 * transformer whose dependency isn't in the editor throws at runtime, so we
 * filter those out up front.
 *
 * Detection uses three signals because Lexical does not expose a stable
 * public identifier for transformers:
 *   1. Reference equality against the imported CodeNode class.
 *   2. String match against dependency `.name` (covers minified bundles and
 *      plain-string dependency entries), while excluding CodeHighlightNode
 *      which is a separate inline-code concern we DO want to keep.
 *   3. RegExp inspection for the triple-backtick fence or inline-code +
 *      "code" wording — catches multiline transformers where the dependency
 *      list may be empty but the pattern still targets code blocks.
 *
 * @param transformer - Lexical markdown transformer to inspect
 * @returns true when the transformer targets code nodes and must be excluded
 */
export function hasCodeNodeDependency(
	transformer: InspectableTransformer,
): boolean {
	// Signal 1 + 2: inspect the declared dependency list if present.
	if (transformer.dependencies && transformer.dependencies.length > 0) {
		// Fast path: reference equality with the real CodeNode class, or the
		// literal string 'CodeNode' that some transformer entries use.
		const hasCodeNode = transformer.dependencies.some(
			dep => dep === CodeNode || dep === 'CodeNode',
		);
		if (hasCodeNode) {
			return true;
		}
		// Fallback: match by name — handles minified builds and string deps.
		const depNames = transformer.dependencies.map(dep => {
			if (typeof dep === 'function') {
				return dep.name || dep.constructor?.name;
			}
			return String(dep);
		});
		if (
			depNames.some(
				name =>
					name &&
					// Explicitly keep CodeHighlightNode (inline code) — that node IS
					// registered in the editor config, so its transformer is valid.
					(name.includes('CodeNode') ||
						(name.includes('Code') && !name.includes('CodeHighlight'))),
			)
		) {
			return true;
		}
	}
	// Signal 3: regex inspection — catches transformers whose dependency list
	// is empty but whose pattern still targets fenced or inline code blocks.
	if ('regExp' in transformer && transformer.regExp) {
		const regexStr = transformer.regExp.toString();
		if (
			regexStr.includes('```') ||
			(regexStr.includes('`') && regexStr.includes('code'))
		) {
			return true;
		}
	}
	return false;
}

/**
 * Curated markdown transformer list used by both create and update raffle
 * description editors. Two deliberate exclusions vs Lexical defaults:
 *
 *   1. Any transformer that depends on CodeNode — the editor config doesn't
 *      register CodeNode, so including these would throw at runtime. See
 *      `hasCodeNodeDependency` for the detection rationale.
 *   2. The link transformer `[text](url)` — raffle descriptions do not allow
 *      arbitrary hyperlinks (anti-phishing / content moderation). Detected
 *      via regex shape because Lexical doesn't expose a stable link id.
 *
 * CHECK_LIST is prepended so task-list items serialize round-trip correctly.
 *
 * Exported as a plain array (not `as const`) because Lexical's conversion
 * APIs expect a mutable `Transformer[]` — marking it readonly would force
 * unsafe casts at every call site.
 */
export const MARKDOWN_TRANSFORMERS = [
	CHECK_LIST,
	...ELEMENT_TRANSFORMERS.filter(
		transformer => !hasCodeNodeDependency(transformer),
	),
	...MULTILINE_ELEMENT_TRANSFORMERS.filter(
		transformer => !hasCodeNodeDependency(transformer),
	),
	...TEXT_FORMAT_TRANSFORMERS,
	...TEXT_MATCH_TRANSFORMERS.filter(transformer => {
		// Drop the link transformer: pattern is `\[text\]\(url\)`. We match
		// on all four escaped brackets/parens because Lexical's link
		// transformer has no stable identifier we can key off.
		if (transformer.type === 'text-match' && transformer.regExp) {
			const regexStr = transformer.regExp.toString();
			if (
				regexStr.includes('\\[') &&
				regexStr.includes('\\]') &&
				regexStr.includes('\\(') &&
				regexStr.includes('\\)')
			) {
				return false;
			}
		}
		return true;
	}),
];

/**
 * Props for MarkdownSyncPlugin — bridges a markdown string field in
 * react-hook-form with the Lexical editor state.
 */
export type MarkdownSyncPluginProps = {
	/** Current markdown value from the form field (source of truth). */
	markdownValue: string;
	/** Called when the user edits content — writes back to the form. */
	onMarkdownChange: (markdown: string) => void;
};

/**
 * Plugin that synchronizes a markdown string between react-hook-form and
 * the Lexical editor. Lives inside <LexicalComposer> so it can access the
 * editor via `useLexicalComposerContext`.
 *
 * Loop prevention is the whole point of this component. Without guards you
 * get: form → editor.update → OnChangePlugin → form → editor.update → ...
 * We use three refs:
 *
 *   - `lastMarkdownRef`  — the last markdown string we wrote TO the editor,
 *     used to deduplicate onChange fires that would otherwise echo our own
 *     programmatic writes back into the form.
 *   - `isUpdatingRef`    — set to true while we're mid programmatic update,
 *     checked by the OnChangePlugin handler to skip our own writes.
 *   - `isInitializedRef` — guards the mount-only seed path so StrictMode
 *     double-invoke and prop updates don't re-seed the editor.
 *
 * The unlock (`isUpdatingRef.current = false`) is deferred via `useTimeout`
 * — not raw setTimeout — so:
 *   (a) it auto-clears on unmount (no stale callback fires into a dead
 *       editor), and
 *   (b) Lexical's microtask queue drains FIRST, guaranteeing the
 *       OnChangePlugin has already observed `isUpdatingRef === true` for
 *       the entire programmatic write.
 *
 * @param props - See {@link MarkdownSyncPluginProps}
 * @returns The OnChangePlugin wired up to sync edits back to the form
 */
export function MarkdownSyncPlugin({
	markdownValue,
	onMarkdownChange,
}: MarkdownSyncPluginProps) {
	const [editor] = useLexicalComposerContext();
	// Ref: the last markdown value we wrote to the editor. Compared in both
	// directions to dedupe echoes — ref (not state) because it must update
	// synchronously within the same tick as the write.
	const lastMarkdownRef = useRef<string>(markdownValue || '');
	// Ref: guards the OnChangePlugin from echoing our own programmatic writes
	// back into the form. Must be a ref so the OnChangePlugin callback sees
	// the CURRENT value without being recreated on every toggle.
	const isUpdatingRef = useRef(false);
	// Ref: prevents the mount seed from running twice under StrictMode and
	// suppresses the sync-effect until after initial hydration.
	const isInitializedRef = useRef(false);
	// Cleanup-safe setTimeout — auto-clears on unmount. Used to defer the
	// `isUpdatingRef = false` unlock to the next tick so Lexical's update
	// cycle has fully flushed before the OnChangePlugin is re-enabled.
	const setDeferredUnlock = useTimeout();

	// mount: Seed the editor with the initial markdown value from form state.
	// This runs once (guarded by isInitializedRef) — subsequent markdownValue
	// changes are handled by the sync effect below.
	useEffect(() => {
		if (!isInitializedRef.current) {
			isUpdatingRef.current = true;
			editor.update(() => {
				const root = $getRoot();
				root.clear();
				if (markdownValue) {
					$convertFromMarkdownString(markdownValue, MARKDOWN_TRANSFORMERS);
				}
			});
			lastMarkdownRef.current = markdownValue || '';
			isInitializedRef.current = true;
			// Defer unlock to next tick so the editor update commits before
			// the OnChangePlugin is allowed to fire. Without the defer, the
			// very first onChange echoes the seed back into the form.
			setDeferredUnlock(() => {
				isUpdatingRef.current = false;
			}, 0);
		}
	}, [editor, markdownValue, setDeferredUnlock]);

	// Sync: update the editor when the form value changes externally (draft
	// restore, form reset, optimistic rollback). Compared against
	// lastMarkdownRef to avoid reapplying our own writes.
	useEffect(() => {
		if (!isInitializedRef.current || isUpdatingRef.current) return;

		editor.getEditorState().read(() => {
			const currentMarkdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
			if (
				currentMarkdown !== markdownValue &&
				markdownValue !== lastMarkdownRef.current
			) {
				isUpdatingRef.current = true;
				editor.update(() => {
					const root = $getRoot();
					root.clear();
					if (markdownValue) {
						$convertFromMarkdownString(markdownValue, MARKDOWN_TRANSFORMERS);
					}
				});
				lastMarkdownRef.current = markdownValue || '';
				setDeferredUnlock(() => {
					isUpdatingRef.current = false;
				}, 0);
			}
		});
	}, [editor, markdownValue, setDeferredUnlock]);

	return (
		<OnChangePlugin
			ignoreSelectionChange={true}
			onChange={editorState => {
				// Skip echoes of our own programmatic writes and any pre-init
				// fires (Lexical emits one onChange immediately on mount).
				if (isUpdatingRef.current || !isInitializedRef.current) return;

				editorState.read(() => {
					const markdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
					if (markdown !== lastMarkdownRef.current) {
						lastMarkdownRef.current = markdown;
						onMarkdownChange(markdown);
					}
				});
			}}
		/>
	);
}
