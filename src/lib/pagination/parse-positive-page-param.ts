export function parsePositivePageParam(pageParam?: string): number {
	const parsed = Number.parseInt(pageParam ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return 1;
	}
	return parsed;
}
