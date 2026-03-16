'use client';

import { useMutation } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ReportErrorCode } from '@/types/errors';
import type { CreateReportPayload, UserReportResponse } from '@/types/report';

import { createReport } from './create-report';

/**
 * Mutation hook for submitting a content report
 *
 * Write-only — no cache invalidation needed since reports
 * are not displayed in the user-facing UI.
 *
 * @returns React Query mutation result
 */
export function useCreateReport() {
	return useMutation<
		UserReportResponse,
		ServiceError<ReportErrorCode>,
		CreateReportPayload
	>({
		mutationFn: async function submitReport(payload) {
			const result = await createReport(payload);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
	});
}
