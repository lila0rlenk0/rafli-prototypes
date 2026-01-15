/**
 * Props for the ProfileInfoField component
 */
interface ProfileInfoFieldProps {
	label: string;
	value: string;
	className?: string;
}

/**
 * ProfileInfoField Component
 *
 * Displays a labeled field with a value, used throughout the profile
 * sections to show user information in a consistent format.
 *
 * @param label - The label text displayed above the value
 * @param value - The actual value to display
 * @param className - Optional additional CSS classes
 */
export function ProfileInfoField({
	label,
	value,
	className = '',
}: ProfileInfoFieldProps) {
	return (
		<div className={`flex flex-col gap-2 ${className}`}>
			<span className="text-sm text-[#7B7B7B]">{label}</span>
			<span className="text-lg font-medium text-black/95">{value}</span>
		</div>
	);
}
