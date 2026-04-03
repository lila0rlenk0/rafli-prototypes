import { redirect } from 'next/navigation';

/**
 * Admin root page — redirects to the KYC verification reviews list.
 * This is the default landing page for /admin.
 */
export default function AdminPage() {
	redirect('/admin/verification');
}
