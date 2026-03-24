import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getSelection } from 'lexical';

import { useToolbarContext } from '@/components/ui/editor/context/toolbar-context';
import { blockTypeToBlockName } from '@/components/ui/editor/plugins/toolbar/block-format/block-format-data';
import { SelectItem } from '@/components/ui/select';

// Stable empty array for default prop — prevents new reference on each render
const EMPTY_LEVELS: HeadingTagType[] = [];

export function FormatHeading({
	levels = EMPTY_LEVELS,
}: {
	levels: HeadingTagType[];
}) {
	const { activeEditor, blockType } = useToolbarContext();

	const formatHeading = (headingSize: HeadingTagType) => {
		if (blockType !== headingSize) {
			activeEditor.update(() => {
				const selection = $getSelection();
				$setBlocksType(selection, () => $createHeadingNode(headingSize));
			});
		}
	};

	return levels.map(level => (
		<SelectItem key={level} value={level} onSelect={() => formatHeading(level)}>
			<div className="flex items-center gap-1 font-normal">
				{blockTypeToBlockName[level].icon}
				{blockTypeToBlockName[level].label}
			</div>
		</SelectItem>
	));
}
