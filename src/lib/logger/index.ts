/**
 * Logger — Wide Event / Canonical Log Line
 *
 * One structured JSON event per server action, emitted to stdout.
 * Vercel log drain forwards to observability tools (Datadog, Axiom, etc.).
 *
 * @see event.ts — WideEvent type and creation
 * @see sampling.ts — tail sampling (keep failures, sample successes)
 * @see with-logging.ts — HOF wrapper for server actions
 */

export { createWideEvent, emitWideEvent, type WideEvent } from './event';
export { shouldSample } from './sampling';
export { withLogging } from './with-logging';
