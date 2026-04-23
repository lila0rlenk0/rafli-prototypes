import { ScreenLoader } from '@/components/ui-custom/screen-loader';

/**
 * Loading state for the verification page
 *
 * @returns Centered spinner placeholder while page loads
 */
export default function VerificationLoading() {
	return <ScreenLoader className="h-tall-screen" />;
}
