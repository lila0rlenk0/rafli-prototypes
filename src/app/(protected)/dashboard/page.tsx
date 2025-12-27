import { SignOutButton } from '@/components/auth/sign-out-button';
import { getCurrentUser } from '@/lib/auth/session';

export default async function DashboardPage() {
	const user = await getCurrentUser();

	return (
		<div className="container mx-auto p-8">
			<div className="max-w-2xl">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<SignOutButton variant="outline" />
				</div>

				{user && (
					<div className="rounded-lg border bg-white p-6 shadow-sm">
						<h2 className="mb-4 text-xl font-semibold">User Information</h2>
						<div className="space-y-2">
							<div>
								<span className="font-medium">Name:</span> {user.name}
							</div>
							<div>
								<span className="font-medium">Email:</span> {user.email}
							</div>
							<div>
								<span className="font-medium">Email Verified:</span>{' '}
								{user.emailVerified ? (
									<span className="text-green-600">Yes</span>
								) : (
									<span className="text-red-600">No</span>
								)}
							</div>
							<div>
								<span className="font-medium">User ID:</span>{' '}
								<code className="rounded bg-gray-100 px-2 py-1 text-sm">
									{user.id}
								</code>
							</div>
						</div>
					</div>
				)}

				<div className="mt-6 text-sm text-gray-600">
					<p>
						This is a protected route. You can only see this page if you are
						authenticated.
					</p>
				</div>
			</div>
		</div>
	);
}
