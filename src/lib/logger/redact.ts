import 'server-only';

/**
 * Deep PII / secret redaction for structured log payloads.
 *
 * Logs are the single highest-volume data exfil path in a production app:
 * one missed `password` field in a wide event ships every credential to
 * whatever log drain Vercel is forwarding to. This module is the
 * last-line defence before `JSON.stringify()` hits stdout.
 *
 * Strategy:
 * - Key-based redaction for structured fields (`password`, `authorization`,
 *   `Set-Cookie`, etc.) — case-insensitive, matches any object depth.
 * - Pattern-based scrub on string values for anything that leaks in via
 *   freeform `msg` or error messages: email addresses and JWT/Bearer
 *   tokens. Regex is deliberately conservative — false-negative on
 *   non-standard token shapes is preferable to false-positive on noun
 *   phrases that happen to contain `@` (we keep those as-is).
 * - Circular-reference guard via `WeakSet` — a logger that throws on a
 *   circular graph defeats the purpose of logging.
 *
 * Not a cryptographic scrubber: do not rely on this for compliance-grade
 * de-identification. Its job is to stop accidental leakage of fields
 * engineers forgot to strip at the call site.
 */

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 8;

// Case-insensitive set — compared against `key.toLowerCase()`.
// Extended union covers HTTP header names, cookie fields, credential
// shapes, and platform-specific secrets we've observed in payloads.
const SENSITIVE_KEYS = new Set<string>([
	'password',
	'passwd',
	'pwd',
	'token',
	'access_token',
	'accesstoken',
	'refresh_token',
	'refreshtoken',
	'id_token',
	'idtoken',
	'authorization',
	'auth',
	'cookie',
	'set-cookie',
	'secret',
	'apikey',
	'api_key',
	'api-key',
	'sessionid',
	'session_id',
	'session-id',
	'ssn',
	'creditcard',
	'credit_card',
	'cardnumber',
	'card_number',
	'cvv',
	'cvc',
	'privatekey',
	'private_key',
	'mnemonic',
	'seedphrase',
	'seed_phrase',
]);

// Email: deliberately strict. Matches RFC 5322 common case, not the
// full grammar — the long-tail addresses we'd miss are rare enough
// that a downstream scrubber is a better fix than a monster regex.
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

// JWTs: three base64url segments separated by dots, starting with the
// canonical `eyJ` (base64 for `{"`). Catches Bearer tokens, refresh
// tokens, and magic-link tokens in free-text strings.
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

/**
 * Scrub a string value in place — email and JWT patterns only.
 * Short-circuits when the string contains neither marker so we don't
 * build a RegExp state machine for every log line.
 *
 * @param value - Raw string value from a log field or message
 * @returns The same string with email and JWT matches replaced by `[REDACTED]`
 */
function redactString(value: string): string {
	// Fast path — most strings are neither emails nor JWTs.
	if (!value.includes('@') && !value.includes('eyJ')) return value;

	return value.replace(EMAIL_REGEX, REDACTED).replace(JWT_REGEX, REDACTED);
}

/**
 * Serialize an `Error` to a JSON-friendly shape with a scrubbed message
 * and stack. `Error.prototype` is not enumerable, so a raw spread would
 * drop `name`, `message`, and `stack` — the three fields we actually
 * want in the log.
 *
 * @param err - Error instance caught in the payload walk
 * @returns Plain object ready for `JSON.stringify`
 */
function redactError(err: Error): Record<string, unknown> {
	return {
		name: err.name,
		message: redactString(err.message),
		stack: err.stack ? redactString(err.stack) : undefined,
	};
}

/**
 * Walk a plain object, redacting sensitive keys and recursing into
 * values. Split out from `redactValue` so cyclomatic complexity stays
 * under the eslint threshold and so each guard has one reason to exist.
 *
 * @param obj - Input object (already cycle-checked by the caller)
 * @param seen - Shared WeakSet tracking visited references
 * @param depth - Current recursion depth
 * @returns Redacted shallow copy
 */
function redactObject(
	obj: Record<string, unknown>,
	seen: WeakSet<object>,
	depth: number,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(obj)) {
		if (SENSITIVE_KEYS.has(key.toLowerCase())) {
			out[key] = REDACTED;
			continue;
		}
		out[key] = redactValue(obj[key], seen, depth + 1);
	}
	return out;
}

type Primitive = string | number | boolean | bigint;

/**
 * Narrow `unknown` to one of the primitive types the scrubber handles.
 * Extracted so `redactValue` can dispatch on primitives without owning
 * the full `typeof` ladder and blowing its cyclomatic-complexity budget.
 *
 * @param value - Candidate of any type
 * @returns `true` when the value is a primitive we redact in place
 */
function isPrimitive(value: unknown): value is Primitive {
	const t = typeof value;
	return t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint';
}

/**
 * Recursive walk with depth + cycle guards. Returns a new object —
 * never mutates the input (callers may keep references to the original).
 *
 * @param value - Value of any shape (primitive, object, array)
 * @param seen - Tracks already-visited object references to break cycles
 * @param depth - Current recursion depth; stops at `MAX_DEPTH`
 * @returns Redacted copy of `value`
 */
function redactValue(
	value: unknown,
	seen: WeakSet<object>,
	depth: number,
): unknown {
	if (depth > MAX_DEPTH) return '[MAX_DEPTH]';
	if (value === null || value === undefined) return value;

	if (isPrimitive(value)) {
		return typeof value === 'string' ? redactString(value) : value;
	}

	if (value instanceof Error) return redactError(value);

	// `typeof new Date() === 'object'` and its own keys are empty, so a
	// naïve object walk would mangle every timestamped field to `{}` —
	// `createdAt`, `completedAt`, etc. would silently disappear from
	// logs. Serialize to ISO string (the same representation
	// `JSON.stringify` produces via `toJSON`) so Date survives redaction
	// as a queryable value.
	if (value instanceof Date) return value.toISOString();

	if (Array.isArray(value)) {
		return value.map(item => redactValue(item, seen, depth + 1));
	}

	if (typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		// Cycle guard: returning a marker is safer than throwing — a
		// logger that crashes on a cyclic payload is worse than a
		// logger that writes `[CIRCULAR]` for the offending branch.
		if (seen.has(obj)) return '[CIRCULAR]';
		seen.add(obj);
		return redactObject(obj, seen, depth);
	}

	// Functions, symbols, etc. — not meaningful in a JSON log line.
	return undefined;
}

/**
 * Entry point — scrubs a structured log payload for sensitive data.
 *
 * @param payload - Object about to be serialized into a log line
 * @returns Redacted copy safe to send to stdout / a log drain
 */
export function redact<T extends Record<string, unknown>>(
	payload: T,
): Record<string, unknown> {
	return redactValue(payload, new WeakSet(), 0) as Record<string, unknown>;
}
