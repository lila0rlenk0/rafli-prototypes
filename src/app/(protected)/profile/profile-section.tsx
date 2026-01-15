import { Pencil } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Props for the ProfileSection component
 */
interface ProfileSectionProps {
	title: string;
	id: string;
	description?: string;
	children: ReactNode;
	showEditIcon?: boolean;
}

/**
 * ProfileSection Component
 *
 * A reusable container component for profile sections.
 * Displays a section with a title, optional description, edit icon,
 * and content area.
 *
 * @param title - The section title displayed as a heading
 * @param description - Optional description text below the title
 * @param children - The content to render inside the section
 * @param showEditIcon - Whether to show the pencil edit icon (default: true)
 */
export function ProfileSection({
	title,
	id,
	description,
	children,
	showEditIcon = true,
}: ProfileSectionProps) {
	return (
		<div className="rounded-3xl bg-white p-[60px]" id={id}>
			<div className="mb-6 flex items-start justify-between">
				<div className="flex flex-col gap-3">
					<h3 className="font-clash-display text-[28px] font-semibold tracking-[0.14px] text-black">
						{title}
					</h3>
					{description && (
						<p className="max-w-[726px] text-base leading-relaxed text-black/95">
							{description}
						</p>
					)}
				</div>
				{showEditIcon && (
					<button
						type="button"
						className="p-2 text-black/50 transition-colors hover:text-black"
						aria-label={`Edit ${title}`}
					>
						<Pencil className="size-5" />
					</button>
				)}
			</div>
			{children}
		</div>
	);
}
