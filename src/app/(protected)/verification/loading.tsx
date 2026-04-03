import { ScreenLoader } from '@/components/ui/screen-loader';

/**
 * Loading state for the verification page
 *
 * @returns Centered spinner placeholder while page loads
 */
export default function VerificationLoading() {
	return <ScreenLoader className="h-[60vh]" />;
}
