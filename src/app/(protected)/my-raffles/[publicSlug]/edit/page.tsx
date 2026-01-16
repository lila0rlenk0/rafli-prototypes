import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Edit Raffle Page (Placeholder)
 *
 * Placeholder page for editing raffles.
 * Will be implemented in future with full edit functionality.
 */
export default async function EditRafflePage({ params }: PageProps) {
	const { publicSlug } = await params;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-16">
			<div className="space-y-6 text-center">
				<h1 className="text-4xl font-bold">Edit Raffle</h1>
				<p className="text-xl text-gray-600">
					Editing raffle: <span className="font-mono">{publicSlug}</span>
				</p>

				<div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
					<p className="mb-4 text-gray-500">
						Edit raffle functionality coming soon!
					</p>
					<p className="text-sm text-gray-400">
						This page will allow you to modify your draft or queued raffles.
					</p>
				</div>

				<Link href="/my-raffles">
					<Button variant="outline" className="mt-6">
						Back to My Raffles
					</Button>
				</Link>
			</div>
		</div>
	);
}
