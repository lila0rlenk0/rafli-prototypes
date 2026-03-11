'use client';

import { useMutation } from '@tanstack/react-query';

import { serviceError, type ServiceError } from '@/lib/query/errors';
import type { ReportErrorCode } from '@/types/errors';
import type { CreateReportPayload, UserReportResponse } from '@/types/report';

import { createReport } from './create-report';

/**
 * Mutation hook for submitting a content report.
 * No cache invalidation needed — reports are write-only for users.
 * @returns React Query mutation result
 */
export function useCreateReport() {
	return useMutation<
		UserReportResponse,
		ServiceError<ReportErrorCode>,
		CreateReportPayload
	>({
		mutationFn: async function submitReport(payload: CreateReportPayload) {
			const result = await createReport(payload);
			if (!result.success) throw serviceError(result.error);
			return result.data;
		},
	});
}
