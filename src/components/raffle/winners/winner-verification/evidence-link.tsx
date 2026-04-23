import { ExternalLink } from 'lucide-react';

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/class-names';

interface VerificationEvidenceLinkProps {
	href: string;
	label: string;
	tooltip: string;
	tone: 'blue' | 'neutral';
}

/**
 * Named evidence pill (VRF coordinator, handler, manifest, commit tx).
 * Stayed as a dedicated wrapper — the five callsites shared identical
 * tooltip + anchor + icon layout and three different copies would rot
 * independently otherwise.
 */
export function VerificationEvidenceLink({
	href,
	label,
	tooltip,
	tone,
}: VerificationEvidenceLinkProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(
						'inline-flex items-center gap-1 rounded px-2 py-1',
						tone === 'blue'
							? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
							: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
					)}
				>
					{label}
					<ExternalLink className="size-3" />
				</a>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
