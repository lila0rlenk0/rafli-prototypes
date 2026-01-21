import { ChangePasswordForm } from './change-password-form';

/**
 * SecuritySection Component
 *
 * Displays security-related settings including password change functionality.
 * Only shows password change option for users with password-based authentication.
 */
export function SecuritySection() {
	return (
		<div
			className="relative flex w-full flex-col gap-4 rounded-2xl bg-white p-8"
			id="security"
		>
			<div className="flex flex-col gap-1">
				<span className="text-sm">Password</span>
				<span className="text-muted-foreground mb-2 text-sm">
					Change your account password
				</span>
				<ChangePasswordForm />
			</div>
		</div>
	);
}
