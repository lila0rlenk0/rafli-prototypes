import { ChangePasswordForm } from './change-password-form';
import { SetPasswordForm } from './set-password-form';

interface SecuritySectionProps {
	/**
	 * Whether the user currently has a password on their credential account.
	 * Drives which form renders: `false` (social-login or magic-link signup)
	 * → `<SetPasswordForm>` to add one; `true` → `<ChangePasswordForm>`
	 * which requires the current password. Read off `GET /me`'s
	 * `hasPassword` field at the route level — defaulting to `true` when
	 * the /me fetch fails is the safer fallback (rejecting a set-password
	 * call is honest; rendering a set-password form to a password user
	 * would let them clobber their existing password without proving they
	 * own it).
	 */
	readonly hasPassword: boolean;
}

/**
 * SecuritySection Component
 *
 * Displays the password-management card. Branches on `hasPassword`:
 *   - `false` → `<SetPasswordForm>` for OAuth/magic-link signups adding
 *     their first password.
 *   - `true` → `<ChangePasswordForm>` for users who already have one.
 *
 * The heading + copy stay constant because the section identity ("Password")
 * doesn't change; only the form below it switches.
 *
 * @returns Card with the appropriate password form.
 */
export function SecuritySection({ hasPassword }: SecuritySectionProps) {
	return (
		<div
			className="relative flex w-full flex-col gap-6 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-12"
			id="security"
		>
			<div className="flex flex-col gap-2">
				<h3 className="font-clash-display text-headline-sm font-semibold text-black">
					Password
				</h3>
				<p className="text-ink-500 text-base/relaxed">
					{hasPassword
						? 'Change your password'
						: 'Add a password to sign in without your magic link or social provider'}
				</p>
			</div>
			{hasPassword ? <ChangePasswordForm /> : <SetPasswordForm />}
		</div>
	);
}
