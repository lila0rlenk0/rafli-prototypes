import { AuthUser } from '@/types/auth';
import { EditableAvatar } from './editable-avatar';
import { EditableBio } from './editable-bio';

/**
 * Props for the PersonalInformationSection component
 */
interface PersonalInformationSectionProps {
	user?: AuthUser;
	avatarUrl?: string | null;
	bio?: string | null;
}

/**
 * PersonalInformationSection Component
 *
 * Displays the user's personal information including avatar,
 * full name, email, and bio. Shows a placeholder avatar with
 * user initials when no avatar image is available.
 *
 * @param user - Optional authenticated user object containing
 *               name, email, and other profile information
 */
export function PersonalInformationSection({
	user,
	avatarUrl,
	bio,
}: PersonalInformationSectionProps) {
	/**
	 * Gets the user's display name
	 *
	 * Returns the user's name if available, otherwise returns
	 * a default placeholder name.
	 *
	 * @returns The user's name or 'Participant' as fallback
	 */
	function getUserName(): string {
		if (!user) return 'Participant';

		return user.name;
	}

	/**
	 * Generates user initials from their name
	 *
	 * Extracts the first letter of each word in the user's name,
	 * takes up to 2 characters, and converts them to uppercase.
	 *
	 * @returns Uppercase initials (max 2 characters) or empty string
	 */
	function getUserInitials(): string {
		const userName = getUserName();

		return userName
			.split(' ')
			.map(word => word[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	/**
	 * Gets the user's email address
	 *
	 * Returns the user's email if available, otherwise returns
	 * 'N/A' as a placeholder.
	 *
	 * @returns The user's email or 'N/A' if not available
	 */
	function getUserEmail(): string {
		if (!user) return 'N/A';

		return user.email;
	}

	/**
	 * Gets the user's avatar image URL
	 *
	 * @returns The avatar image URL or null if not available
	 */
	function getUserAvatarUrl(): string | null {
		return avatarUrl ?? null;
	}

	return (
		<div
			className="relative flex w-full flex-col gap-4 rounded-2xl bg-white p-8"
			id="personal-information"
		>
			<EditableAvatar
				avatarUrl={getUserAvatarUrl()}
				initials={getUserInitials()}
				size={85}
			/>

			<div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="flex flex-col gap-1">
					<span className="text-sm">Full Name</span>
					<span className="text-lg font-semibold">{getUserName()}</span>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-sm">Email</span>
					<span className="max-w-xs truncate text-lg font-semibold">
						{getUserEmail()}
					</span>
				</div>
			</div>

			<EditableBio bio={bio} />
		</div>
	);
}
