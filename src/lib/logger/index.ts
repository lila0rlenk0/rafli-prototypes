/**
 * Barrel — single entry point for structured logging and wide events.
 *
 * Import from `@/lib/logger` rather than the individual files so the
 * logger implementation can evolve (e.g. swapping stdout for a
 * dedicated transport) without touching call sites.
 */

export {
	logger,
	logInfo,
	logError,
	type LogFields,
	type LogLevel,
} from './logger';
export {
	createWideEvent,
	withWideEvent,
	type Outcome,
	type WideEvent,
	type WideEventResult,
	type WithWideEventContext,
} from './wide-event';
