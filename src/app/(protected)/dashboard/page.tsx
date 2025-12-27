import { getCurrentUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/sign-out-button';

export default async function DashboardPage() {
	const user = await getCurrentUser();

	return (
		<div className="container mx-auto p-8">
			<div className="max-w-2xl">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<SignOutButton variant="outline" />
				</div>

				{user && (
					<div className="bg-white rounded-lg border p-6 shadow-sm">
						<h2 className="text-xl font-semibold mb-4">User Information</h2>
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
								<code className="bg-gray-100 px-2 py-1 rounded text-sm">
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
