import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Not Found Page for Host Profile
 *
 * Displayed when a host profile cannot be found.
 */
export default function HostNotFound() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
			<h1 className="font-clash-display mb-4 text-4xl font-bold">
				Host Not Found
			</h1>
			<p className="mb-8 max-w-md text-lg text-gray-600">
				We couldn&apos;t find the host you&apos;re looking for. They may have
				changed their username or the profile doesn&apos;t exist.
			</p>
			<Link
				href="/browse"
				className="flex items-center gap-2 rounded-full border border-black px-8 py-3 font-semibold transition-colors hover:bg-black hover:text-white"
			>
				<ArrowLeft className="size-4" />
				Back to Browse
			</Link>
		</div>
	);
}
