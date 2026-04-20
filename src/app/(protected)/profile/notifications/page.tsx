import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { NotificationsTable } from '@/components/profile/notifications-table';
import { parsePositivePageParam } from '@/lib/pagination/parse-positive-page-param';
import { getNotifications } from '@/services/notification/get-notifications';

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

	// `chat_message` rows are filtered server-side — chat owns its own unread
	// surface at `/messages` and the bell would otherwise double-count them.
	// `total` here is the already-filtered count, so pagination lines up with
	// the rows the user can actually see.
	const notifications = result.success ? result.data.notifications : [];
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
