import { CheckCircle2Icon } from 'lucide-react';

/**
 * Transparency bullet copy — kept as a module-scope constant so the array
 * identity is stable across renders and the `.map()` output is predictable
 * for React's key heuristic.
 */
const TRANSPARENCY_POINTS: ReadonlyArray<string> = [
	'Selecting the winner by code, verified on-chain',
	"Auto-refunding participants if the minimum threshold isn't reached.",
	'Verifying host identity and previous sweepstakes',
];

/**
 * Trust-building bullet list shown under the raffle info card. Static
 * marketing copy — purely presentational.
 */
export function TransparencySection() {
	return (
		<div className="flex flex-col gap-4 text-center">
			<h3 className="font-semibold">Rafli ensures transparency by</h3>
			<div className="inline-flex flex-col gap-2 text-left">
				{TRANSPARENCY_POINTS.map(point => (
					<div key={point} className="flex items-start gap-2">
						<CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-500" />
						<p className="text-sm">{point}</p>
					</div>
				))}
			</div>
		</div>
	);
}
