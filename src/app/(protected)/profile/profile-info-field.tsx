interface ProfileInfoFieldProps {
	label: string;
	value: string;
	className?: string;
}

/** Labeled read-only field used across profile sections. */
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
