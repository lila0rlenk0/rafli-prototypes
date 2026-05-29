import { Copy } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ComponentProps } from 'react';

import { getSession } from '@/lib/auth/session';
import { extractCryptoFormFields } from '@/lib/utils/crypto-form';
import { utcIsoToZonedWallClock } from '@/lib/utils/format/zoned-time-to-utc';
import { getCategories } from '@/services/raffle/get-categories';
import { getMyRaffles } from '@/services/raffle/get-my-raffles';
import { getQuestions } from '@/services/raffle/get-questions';
import { getRaffle } from '@/services/raffle/get-raffle';
import { getRaffleCover } from '@/services/raffle/get-raffle-cover';
import { getRaffleGallery } from '@/services/raffle/get-raffle-gallery';
import { ADVANCED_RAFFLE_FORM_DEFAULTS } from '@/lib/validation/raffle/create-form-schema';
import type { EditFormData } from '@/lib/validation/raffle/edit-form-schema';
import { RAFFLE_STATUS, type Raffle } from '@/types/raffle';
import { EditFormProvider } from '@/components/my-raffles/edit/form-provider';
import { FormHeader } from '@/components/my-raffles/edit/form-header';
import { FormStepComponent } from '@/components/my-raffles/edit/form-step-component';

const LEFT_PANEL_LINKS = [
	{
		label: 'Legal Stuff',
		href: '/blog/legal-stuff',
	},
	{
		label: 'How to host a Sweepstakes',
		href: '/blog/how-to-host-a-raffle',
	},
	{
		label: 'Minimum Target',
		href: '/blog/minimum-target',
	},
	{
		label: 'Promo tips',
		href: '/blog/promo-tips',
	},
	{
		label: 'Entry Bundles',
		href: '/blog/ticket-bundles',
	},
];

interface PageProps {
	params: Promise<{
		publicSlug: string;
	}>;
}

/**
 * Converts a Raffle object to EditFormData
 * Maps backend field names to form field names
 *
 * @param raffle - The raffle from the API
 * @returns EditFormData with pre-filled values
 */
function mapRaffleToFormData(raffle: Raffle): EditFormData {
	// Extract the wall-clock the host originally saw, not the editor's
	// browser-local rendering — otherwise computeRaffleDiff produces
	// phantom startAt/endAt changes whenever the editor's timezone
	// differs from raffle.timezone. UTC is the fallback for legacy rows
	// that predate the timezone column.
	const zone = raffle.timezone || 'UTC';
	const { date: startDate, time: startTime } = utcIsoToZonedWallClock(
		raffle.startAt,
		zone,
	);
	const { date: endDate, time: endTime } = utcIsoToZonedWallClock(
		raffle.endAt,
		zone,
	);

	// Use categoryId directly (UUID) instead of converting to slug
	const category = raffle.categoryId || '';

	// Use questionId directly (UUID)
	const checkInQuestion = raffle.questionId || '';

	// Reverse-map cryptoOptions (backend response) back to form input fields.
	// Empty arrays = "all allowed" (backend semantics), but when hydrating
	// from an existing raffle, we preserve the explicit selection so the host
	// sees exactly which chains/tokens were configured.
	const crypto = extractCryptoFormFields(raffle.cryptoOptions);

	return {
		title: raffle.title,
		description: raffle.description,
		price: parseFloat(raffle.declaredValueAmount),
		category,
		// images are handled separately via existing URLs
		coverImage: [],
		startDate,
		startTime,
		endDate,
		endTime,
		pricePerTicket: parseFloat(raffle.ticketPriceAmount),
		numberOfWinners: raffle.numberOfWinners,
		minParticipants: raffle.minParticipants,
		maxParticipants: raffle.maxParticipants,
		checkInQuestion,
		...crypto,
		// Advanced config — hydrate from the raffle where the backend returns
		// it, falling back to backend-equivalent defaults. The diff compares
		// against the same baseline, so an untouched form yields no phantom
		// update (and never clobbers a draft's saved winner/enrollment mode).
		minTickets: raffle.minTickets,
		maxTicketsPerUser:
			raffle.maxTicketsPerUser ??
			ADVANCED_RAFFLE_FORM_DEFAULTS.maxTicketsPerUser,
		winnerSelectionMode:
			raffle.winnerSelectionMode ??
			ADVANCED_RAFFLE_FORM_DEFAULTS.winnerSelectionMode,
		enrollmentMode:
			raffle.enrollmentMode ?? ADVANCED_RAFFLE_FORM_DEFAULTS.enrollmentMode,
		xShareTicketsEnabled:
			raffle.xShareTicketsEnabled ??
			ADVANCED_RAFFLE_FORM_DEFAULTS.xShareTicketsEnabled,
	};
}

/**
 * Edit Raffle Page (Server Component)
 *
 * Data-fetching strategy: two-phase fetch.
 * Phase 1: parallel session + raffle fetch for authorization checks.
 * Phase 2 (post-auth): parallel cover, gallery, questions, categories, raffles count.
 * Uses RAFFLE_DETAIL cache (300s TTL) for raffle, CATEGORIES (3600s) for categories.
 *
 * Server-side protected — only accessible by the raffle host for draft raffles.
 * Redirects to /my-raffles if unauthorized or wrong status, 404 if not found.
 */
export default async function EditRafflePage({ params }: PageProps) {
	const { publicSlug } = await params;

	// Parallel fetch — session and raffle are independent.
	// `authed: true` — host-only edit flow; the authenticated payload guarantees
	// the host sees their own draft state, never a cached public snapshot.
	const [session, raffleResult] = await Promise.all([
		getSession(),
		getRaffle(publicSlug, { authed: true }),
	]);

	if (!session?.user?.id) {
		redirect('/my-raffles');
	}

	if (!raffleResult.success) {
		notFound();
	}

	const raffle = raffleResult.data;

	// Only the host can edit their own draft
	if (raffle.hostId !== session.user.id) {
		redirect('/my-raffles');
	}

	if (raffle.status !== RAFFLE_STATUS.DRAFT) {
		redirect('/my-raffles');
	}

	const userName = session?.user?.name || 'Sweepstakes Host';

	const [
		coverResult,
		galleryResult,
		questionsResult,
		categoriesResult,
		rafflesResult,
	] = await Promise.all([
		getRaffleCover(raffle.id),
		getRaffleGallery(raffle.id),
		getQuestions(),
		getCategories(),
		getMyRaffles(),
	]);

	const questions = questionsResult.success
		? questionsResult.data.questions.filter(q => q.isActive)
		: [];

	const categories = categoriesResult.success
		? categoriesResult.data.categories.filter(c => c.isActive)
		: [];

	const totalRaffles = rafflesResult.success
		? rafflesResult.data.total || 0
		: 0;

	// Extract image URLs — now plain strings from the backend
	const initialCoverUrl =
		coverResult.success && coverResult.data.cover
			? coverResult.data.cover
			: raffle.coverMediaUrl || null;

	const initialGalleryUrls =
		galleryResult.success && galleryResult.data.gallery.length > 0
			? galleryResult.data.gallery
			: raffle.galleryMediaUrls;

	const defaultValues = mapRaffleToFormData(raffle);

	return (
		<div className="flex w-full gap-4">
			<div className="flex h-fit min-w-fit flex-col gap-8 rounded-2xl bg-white px-6 py-12">
				<InfoBigIcon />

				<span className="mr-12 text-xl font-semibold">
					How to build the best Sweepstakes?
				</span>

				{LEFT_PANEL_LINKS.map(link => (
					<Link
						key={link.href}
						href={link.href}
						className="flex w-fit items-center gap-4"
					>
						<Copy className="size-6" />
						<span className="text-ink-600">{link.label}</span>
					</Link>
				))}
			</div>

			<EditFormProvider
				raffle={raffle}
				initialCoverUrl={initialCoverUrl}
				initialGalleryUrls={initialGalleryUrls}
				defaultValues={defaultValues}
				questions={questions}
				categories={categories}
				userName={userName}
				totalRaffles={totalRaffles}
			>
				<div className="flex w-full max-w-195 flex-col">
					<FormHeader />
					<FormStepComponent />
				</div>
			</EditFormProvider>
		</div>
	);
}

function InfoBigIcon(props: ComponentProps<'svg'>) {
	return (
		<svg
			width="100"
			height="100"
			viewBox="0 0 100 100"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M93.6875 38.7589C92.0045 37 90.2634 35.1875 89.6071 33.5937C89 32.1339 88.9643 29.7143 88.9286 27.3705C88.8616 23.0134 88.7902 18.0759 85.3571 14.6429C81.9241 11.2098 76.9866 11.1384 72.6295 11.0714C70.2857 11.0357 67.8661 11 66.4062 10.3929C64.817 9.73661 63 7.99553 61.2411 6.3125C58.1607 3.35268 54.6607 0 50 0C45.3393 0 41.8438 3.35268 38.7589 6.3125C37 7.99553 35.1875 9.73661 33.5937 10.3929C32.1429 11 29.7143 11.0357 27.3705 11.0714C23.0134 11.1384 18.0759 11.2098 14.6429 14.6429C11.2098 18.0759 11.1607 23.0134 11.0714 27.3705C11.0357 29.7143 11 32.1339 10.3929 33.5937C9.73661 35.183 7.99553 37 6.3125 38.7589C3.35268 41.8393 0 45.3393 0 50C0 54.6607 3.35268 58.1562 6.3125 61.2411C7.99553 63 9.73661 64.8125 10.3929 66.4062C11 67.8661 11.0357 70.2857 11.0714 72.6295C11.1384 76.9866 11.2098 81.9241 14.6429 85.3571C18.0759 88.7902 23.0134 88.8616 27.3705 88.9286C29.7143 88.9643 32.1339 89 33.5937 89.6071C35.183 90.2634 37 92.0045 38.7589 93.6875C41.8393 96.6473 45.3393 100 50 100C54.6607 100 58.1562 96.6473 61.2411 93.6875C63 92.0045 64.8125 90.2634 66.4062 89.6071C67.8661 89 70.2857 88.9643 72.6295 88.9286C76.9866 88.8616 81.9241 88.7902 85.3571 85.3571C88.7902 81.9241 88.8616 76.9866 88.9286 72.6295C88.9643 70.2857 89 67.8661 89.6071 66.4062C90.2634 64.817 92.0045 63 93.6875 61.2411C96.6473 58.1607 100 54.6607 100 50C100 45.3393 96.6473 41.8438 93.6875 38.7589ZM88.5312 56.2991C86.3929 58.5312 84.1786 60.8393 83.0045 63.6741C81.8795 66.3973 81.8304 69.5089 81.7857 72.5223C81.7411 75.6473 81.692 78.9196 80.3036 80.3036C78.9152 81.6875 75.6652 81.7411 72.5223 81.7857C69.5089 81.8304 66.3973 81.8795 63.6741 83.0045C60.8393 84.1786 58.5312 86.3929 56.2991 88.5312C54.067 90.6696 51.7857 92.8571 50 92.8571C48.2143 92.8571 45.9152 90.6607 43.7009 88.5312C41.4866 86.4018 39.1607 84.1786 36.3259 83.0045C33.6027 81.8795 30.4911 81.8304 27.4777 81.7857C24.3527 81.7411 21.0804 81.692 19.6964 80.3036C18.3125 78.9152 18.2589 75.6652 18.2143 72.5223C18.1696 69.5089 18.1205 66.3973 16.9955 63.6741C15.8214 60.8393 13.6071 58.5312 11.4687 56.2991C9.33036 54.067 7.14286 51.7857 7.14286 50C7.14286 48.2143 9.33928 45.9152 11.4687 43.7009C13.5982 41.4866 15.8214 39.1607 16.9955 36.3259C18.1205 33.6027 18.1696 30.4911 18.2143 27.4777C18.2589 24.3527 18.308 21.0804 19.6964 19.6964C21.0848 18.3125 24.3348 18.2589 27.4777 18.2143C30.4911 18.1696 33.6027 18.1205 36.3259 16.9955C39.1607 15.8214 41.4687 13.6071 43.7009 11.4687C45.933 9.33036 48.2143 7.14286 50 7.14286C51.7857 7.14286 54.0848 9.33928 56.2991 11.4687C58.5134 13.5982 60.8393 15.8214 63.6741 16.9955C66.3973 18.1205 69.5089 18.1696 72.5223 18.2143C75.6473 18.2589 78.9196 18.308 80.3036 19.6964C81.6875 21.0848 81.7411 24.3348 81.7857 27.4777C81.8304 30.4911 81.8795 33.6027 83.0045 36.3259C84.1786 39.1607 86.3929 41.4687 88.5312 43.7009C90.6696 45.933 92.8571 48.2143 92.8571 50C92.8571 51.7857 90.6607 54.0848 88.5312 56.2991ZM55.3571 73.2143C55.3571 77.3382 50.8929 79.9156 47.3214 77.8537C43.75 75.7917 43.75 70.6368 47.3214 68.5749C48.1359 68.1046 49.0595 67.8571 50 67.8571C52.9586 67.8573 55.3571 70.2557 55.3571 73.2143ZM67.8571 41.0714C67.8571 48.8304 61.7143 55.3259 53.5714 56.8214V57.1429C53.5714 59.8921 50.5952 61.6104 48.2143 60.2358C47.1093 59.5978 46.4286 58.4188 46.4286 57.1429V53.5714C46.4286 51.599 48.0275 50 50 50C55.9062 50 60.7143 45.9821 60.7143 41.0714C60.7143 36.1607 55.9062 32.1429 50 32.1429C44.0937 32.1429 39.2857 36.1607 39.2857 41.0714V42.8571C39.2857 45.6064 36.3095 47.3247 33.9286 45.9501C32.8236 45.3121 32.1429 44.1331 32.1429 42.8571V41.0714C32.1429 32.2098 40.1518 25 50 25C59.8482 25 67.8571 32.2098 67.8571 41.0714Z"
				fill="black"
			/>
		</svg>
	);
}
