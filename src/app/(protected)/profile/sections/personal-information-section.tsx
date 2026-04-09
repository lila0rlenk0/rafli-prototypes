import type { AuthUser } from '@/types/auth';
import { EditableAvatar } from './editable-avatar';
import { EditableBio } from './editable-bio';
import { EditableName } from './editable-name';

interface PersonalInformationSectionProps {
	user?: AuthUser;
	/** Fresh name from API — preferred over JWT-decoded user.name which may be stale */
	profileName?: string | null;
	avatarUrl?: string | null;
	bio?: string | null;
}

/**
 * Profile card showing avatar, name, email, and editable bio.
 *
 * @returns Profile card with avatar, name, email, and editable bio
 */
export function PersonalInformationSection({
	user,
	profileName,
	avatarUrl,
	bio,
}: PersonalInformationSectionProps) {
	function getUserName(): string {
		if (profileName) return profileName;
		if (!user) return 'Participant';
		return user.name;
	}

	/** Uppercase initials (max 2 characters) */
	function getUserInitials(): string {
		const userName = getUserName();
		return userName
			.split(' ')
			.map(word => word[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	function getUserEmail(): string {
		if (!user) return 'N/A';
		return user.email;
	}

	return (
		<div
			className="relative flex w-full flex-col gap-8 overflow-hidden rounded-3xl bg-white px-6 py-10 md:px-10 md:py-15"
			id="personal-information"
		>
			<EditableAvatar
				avatarUrl={avatarUrl ?? null}
				initials={getUserInitials()}
				size={120}
			/>

			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-[202px]">
					<EditableName name={getUserName()} />
					<div className="flex min-w-0 flex-col gap-2">
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
