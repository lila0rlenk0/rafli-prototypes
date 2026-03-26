import { ChangePasswordForm } from './change-password-form';

/**
 * SecuritySection Component
 *
 * Displays security-related settings including password change functionality.
 *
 * @returns Card with password change form
 */
export function SecuritySection() {
	return (
		<div
			className="relative flex w-full flex-col gap-6 rounded-3xl bg-white px-10 py-15"
			id="security"
		>
			<div className="flex flex-col gap-2">
				<h3 className="font-clash-display text-2xl leading-[1.1] font-semibold tracking-[0.12px] text-black">
					Password
				</h3>
				<p className="text-base leading-relaxed text-[#7B7B7B]">
					Change your password
				</p>
			</div>
			<ChangePasswordForm />
		</div>
	);
}
