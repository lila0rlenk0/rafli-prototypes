import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { NotificationsTable } from '@/components/profile/notifications-table';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import { parsePositivePageParam } from '@/lib/pagination/parse-positive-page-param';
import { getNotifications } from '@/services/notification/get-notifications';
import { NOTIFICATION_TYPE } from '@/types/notification';

/**
 * Props for NotificationsPage
 */
interface NotificationsPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

/**
 * Full paginated notifications page
 */
export default async function NotificationsPage({
	searchParams,
}: NotificationsPageProps) {
	const params = await searchParams;
	const page = parsePositivePageParam(params.page);
	const limit = 10;
	const offset = (page - 1) * limit;

	const result = await getNotifications({ limit, offset });

	// Chat-message notifications move to the dedicated /messages inbox when
	// the chat feature ships; filter them from the bell list so the user
	// doesn't see the same item in two places. Flag-off path keeps them
	// visible on this page so the notifications list stays complete during
	// rollout.
	const rawNotifications = result.success ? result.data.notifications : [];
	const notifications = FEATURE_FLAGS.CHAT_ENABLED
		? rawNotifications.filter(n => n.type !== NOTIFICATION_TYPE.CHAT_MESSAGE)
		: rawNotifications;
	const total = result.success ? result.data.total : 0;
	const totalPages = Math.ceil(total / limit);

	/**
	 * Generates page URL with page parameter
	 */
	function getPageUrl(pageNum: number): string {
		return `/profile/notifications?page=${pageNum}`;
	}

	return (
		<div className="flex flex-col gap-6 px-4">
			<div className="flex items-center gap-4">
				<Link href="/profile" className="flex w-fit items-center gap-2">
					<ArrowLeft className="size-4" />
					<span className="font-semibold">Back to Profile</span>
				</Link>
			</div>

			<div className="rounded-2xl bg-white p-8">
				<h1 className="mb-6 text-xl font-semibold">Notifications</h1>

				<NotificationsTable notifications={notifications} />

				{totalPages > 1 ? (
					<div className="mt-6 flex items-center justify-center gap-2">
						{page > 1 ? (
							<Link
								href={getPageUrl(page - 1)}
								className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
							>
								Previous
							</Link>
						) : null}
						<span className="text-muted-foreground px-3 text-sm">
							Page {page} of {totalPages}
						</span>
						{page < totalPages ? (
							<Link
								href={getPageUrl(page + 1)}
								className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
							>
								Next
							</Link>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
