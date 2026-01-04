import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyRafflesPage() {
	return (
		<div className="container mx-auto p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-3xl font-bold">My Raffles</h1>
				<Link href="/my-raffles/create">
					<Button>Create Raffle</Button>
				</Link>
			</div>
		</div>
	);
}
