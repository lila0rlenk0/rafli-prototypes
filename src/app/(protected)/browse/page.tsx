import { SignOutButton } from '@/components/auth/sign-out-button';

export default async function DashboardPage() {
	return (
		<div className="container mx-auto p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-3xl font-bold">Browse</h1>
				<SignOutButton variant="outline" />
			</div>
		</div>
	);
}
