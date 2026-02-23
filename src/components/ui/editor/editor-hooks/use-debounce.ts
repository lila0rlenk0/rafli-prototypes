import { useEffect, useMemo } from 'react';
import type { DebouncedFunc } from 'lodash';
import debounce from 'lodash/debounce';

export function useDebounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	ms: number,
	maxWait?: number,
): DebouncedFunc<T> {
	const debouncedFn = useMemo(
		() => debounce(fn, ms, { maxWait }),
		[fn, ms, maxWait],
	);

	useEffect(() => {
		return () => {
			debouncedFn.cancel();
		};
	}, [debouncedFn]);

	return debouncedFn;
}
