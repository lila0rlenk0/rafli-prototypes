import { AuthUser } from '@/types/auth';
import { EditableAvatar } from './editable-avatar';
import { EditableBio } from './editable-bio';
import { EditableName } from './editable-name';

/**
 * Props for the PersonalInformationSection component
 */
interface PersonalInformationSectionProps {
	user?: AuthUser;
	/** Fresh name from API — preferred over JWT-decoded user.name which may be stale */
	profileName?: string | null;
	avatarUrl?: string | null;
	bio?: string | null;
}

/**
 * PersonalInformationSection Component
 *
 * Displays the user's personal information including avatar,
 * full name, email, and bio.
 *
 * @returns Profile card with avatar, name, email, and editable bio
 */
export function PersonalInformationSection({
	user,
	profileName,
	avatarUrl,
	bio,
}: PersonalInformationSectionProps) {
	/**
	 * @returns The user's name or 'Participant' as fallback
	 */
	function getUserName(): string {
		if (profileName) return profileName;
		if (!user) return 'Participant';
		return user.name;
	}

	/**
	 * @returns Uppercase initials (max 2 characters)
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
	 * @returns The user's email or 'N/A' if not available
	 */
	function getUserEmail(): string {
		if (!user) return 'N/A';
		return user.email;
	}

	/**
	 * @returns The avatar image URL or null
	 */
	function getUserAvatarUrl(): string | null {
		return avatarUrl ?? null;
	}

	return (
		<div
			className="relative flex w-full flex-col gap-8 rounded-3xl bg-white px-10 py-15"
			id="personal-information"
		>
			<EditableAvatar
				avatarUrl={getUserAvatarUrl()}
				initials={getUserInitials()}
				size={120}
			/>

			<div className="flex flex-col gap-8">
				<div className="flex items-center gap-[202px]">
					<EditableName name={getUserName()} />
					<div className="flex w-[438px] flex-col gap-2">
						<span className="text-sm leading-relaxed text-[#7B7B7B]">
							Email
						</span>
						<span className="truncate text-base font-medium text-black/95">
							{getUserEmail()}
						</span>
					</div>
				</div>

				<EditableBio bio={bio} />
			</div>
		</div>
	);
}
