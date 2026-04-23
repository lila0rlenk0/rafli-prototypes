/**
 * Throws a loud runtime error when a union switch receives a value the
 * compile-time exhaustiveness check did not cover.
 *
 * Why this exists: the previous `const _exhaustive: never = value; return
 * _exhaustive` pattern compiled (because `never` is assignable to any
 * return type) but at runtime silently returned `undefined`. If a future
 * union arm was added and a `switch` missed it, the Promise/function
 * resolved with `undefined` and broke consumers quietly. This helper
 * makes the drift loud — throws immediately with the offending value
 * serialized, so the stack trace points at the first missed arm.
 *
 * `never` return type so the compiler removes downstream branches
 * after the call, preserving the exhaustiveness check at the call site.
 *
 * @param value - The offending union member (should be `never` at compile time)
 * @param context - Short identifier to disambiguate which switch fired
 * @throws Always — by design
 */
export function throwUnexpectedCase(value: never, context: string): never {
	throw new Error(`unexpected value in ${context}: ${JSON.stringify(value)}`);
}
