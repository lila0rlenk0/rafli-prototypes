import { EyeOff, Fingerprint, ShieldCheck } from 'lucide-react';

/**
 * Privacy-wall section — visual split showing what never touches IPFS
 * versus what is publicly committed. Dashed border = "absence",
 * communicating "never arrives here" without red-cross error styling;
 * solid border = committed fields that form the public proof.
 */
export function HowItWorksPrivacySection() {
	return (
		<section className="mb-16">
			<h2 className="font-clash-display mb-2 flex items-center gap-2 text-2xl font-semibold">
				<ShieldCheck className="size-6" />
				Public proof, private identity
			</h2>
			<p className="text-muted-foreground mb-6">
				A public ledger makes the draw verifiable. A public ledger must never
				carry personal data. Here&apos;s how we split them.
			</p>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="bg-card rounded-xl border border-dashed p-5">
					<div className="mb-3 flex items-center gap-2">
						<EyeOff className="text-muted-foreground size-5" />
						<h3 className="font-semibold">Never on IPFS</h3>
					</div>
					<ul className="text-muted-foreground flex flex-col gap-1.5 text-sm">
						<li>— Your name</li>
						<li>— Your email</li>
						<li>— Payment info</li>
						<li>— Your account ID</li>
					</ul>
				</div>

				<div className="bg-card rounded-xl border p-5">
					<div className="mb-3 flex items-center gap-2">
						<Fingerprint className="size-5" />
						<h3 className="font-semibold">Public on IPFS</h3>
					</div>
					<ul className="text-muted-foreground flex flex-col gap-1.5 text-sm">
						<li>— Entry number</li>
						<li>— Entry code</li>
						<li>— Identity commitment (one-way hash)</li>
						<li>— Timestamp</li>
					</ul>
				</div>
			</div>

			<p className="text-muted-foreground mt-4 text-sm">
				The <em>identity commitment</em> is a one-way SHA-256 hash of your
				account combined with the sweepstakes ID. Nobody can reverse it to find
				you, but you can recompute it yourself to prove the entry is yours.
				Because the hash is sweepstakes-scoped, your activity also can&apos;t be
				linked across sweepstakes.
			</p>
		</section>
	);
}
