'use client';

import {
	$isListNode,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
} from '@lexical/list';
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	HeadingTagType,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $findMatchingParent, $getNearestNodeOfType } from '@lexical/utils';
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	$isRootOrShadowRoot,
	BaseSelection,
} from 'lexical';

import { useToolbarContext } from '@/components/ui/editor/context/toolbar-context';
import { useUpdateToolbarHandler } from '@/components/ui/editor/editor-hooks/use-update-toolbar';
import { blockTypeToBlockName } from '@/components/ui/editor/plugins/toolbar/block-format/block-format-data';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectTrigger,
} from '@/components/ui/select';

export function BlockFormatDropDown({
	children,
}: {
	children: React.ReactNode;
}) {
	const { activeEditor, blockType, setBlockType } = useToolbarContext();

	function $updateToolbar(selection: BaseSelection) {
		if ($isRangeSelection(selection)) {
			const anchorNode = selection.anchor.getNode();
			let element =
				anchorNode.getKey() === 'root'
					? anchorNode
					: $findMatchingParent(anchorNode, e => {
							const parent = e.getParent();
							return parent !== null && $isRootOrShadowRoot(parent);
						});

			if (element === null) {
				element = anchorNode.getTopLevelElementOrThrow();
			}

			const elementKey = element.getKey();
			const elementDOM = activeEditor.getElementByKey(elementKey);

			if (elementDOM !== null) {
				// setSelectedElementKey(elementKey);
				if ($isListNode(element)) {
					const parentList = $getNearestNodeOfType<ListNode>(
						anchorNode,
						ListNode,
					);
					const type = parentList
						? parentList.getListType()
						: element.getListType();
					setBlockType(type);
				} else {
					const type = $isHeadingNode(element)
						? element.getTag()
						: element.getType();
					if (type in blockTypeToBlockName) {
						setBlockType(type as keyof typeof blockTypeToBlockName);
					}
				}
			}
		}
	}

	useUpdateToolbarHandler($updateToolbar);

	const handleValueChange = (value: string) => {
		setBlockType(value as keyof typeof blockTypeToBlockName);

		activeEditor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return;

			switch (value) {
				case 'paragraph': {
					$setBlocksType(selection, () => $createParagraphNode());
					break;
				}
				case 'h1':
				case 'h2':
				case 'h3': {
					$setBlocksType(selection, () =>
						$createHeadingNode(value as HeadingTagType),
					);
					break;
				}
				case 'number': {
					if (blockType !== 'number') {
						activeEditor.dispatchCommand(
							INSERT_ORDERED_LIST_COMMAND,
							undefined,
						);
					} else {
						$setBlocksType(selection, () => $createParagraphNode());
					}
					break;
				}
				case 'bullet': {
					if (blockType !== 'bullet') {
						activeEditor.dispatchCommand(
							INSERT_UNORDERED_LIST_COMMAND,
							undefined,
						);
					} else {
						$setBlocksType(selection, () => $createParagraphNode());
					}
					break;
				}
				case 'check': {
					if (blockType !== 'check') {
						activeEditor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
					} else {
						$setBlocksType(selection, () => $createParagraphNode());
					}
					break;
				}
				case 'quote': {
					if (blockType !== 'quote') {
						$setBlocksType(selection, () => $createQuoteNode());
					}
					break;
				}
			}
		});
	};

	return (
		<Select value={blockType} onValueChange={handleValueChange}>
			<SelectTrigger size="sm" className="w-min gap-1">
				{blockTypeToBlockName[blockType]?.icon}
				<span>{blockTypeToBlockName[blockType]?.label}</span>
			</SelectTrigger>
			<SelectContent position="popper" className="z-50">
				<SelectGroup>{children}</SelectGroup>
			</SelectContent>
		</Select>
	);
}
