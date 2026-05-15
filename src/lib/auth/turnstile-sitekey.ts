/**
 * Cloudflare's public "always-pass" Turnstile sitekey. Documented for local
 * dev + CI use only — see https://developers.cloudflare.com/turnstile/troubleshooting/testing/.
 *
 * Shipping it in any deployed (non-development) build is a quiet failure mode:
 * - Paired with a real Turnstile secret on the backend it produces 100%
 *   captcha rejections (auth DoS).
 * - Paired with the matching test secret it silently bypasses captcha
 *   verification entirely (security regression).
 *
 * Staging was historically excluded from this guard so preview deploys could
 * skip provisioning a real key. The 2026-05 white-hat audit (M5) flagged that
 * staging defaulting to the test sitekey is itself a security gap: staging
 * frequently runs against the real backend (real Stripe test mode, real CF
 * secret, real DB schema), so a test sitekey there either breaks every login
 * (frustrates QA but harmless) OR silently bypasses captcha (if the staging
 * backend was provisioned with the test secret, attackers reach the auth
 * surface unchallenged). Both are unacceptable; the only safe stance is
 * "non-development environments require a real sitekey".
 */
export const CLOUDFLARE_TEST_SITEKEY = '1x00000000000000000000AA';

/**
 * App environments that MUST ship a real Turnstile sitekey. Adding a new
 * deployed environment (e.g. `'preview'`, `'canary'`) only requires extending
 * this set — the guard below is the single source of truth.
 */
const SITEKEY_REQUIRED_ENVS: ReadonlySet<string> = new Set([
	'production',
	'staging',
]);

/**
 * Asserts the configured Turnstile sitekey is safe for the given app
 * environment. Used as the trust boundary in `@/env/client` so the build
 * fails loudly when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing in any
 * deployed environment and the schema falls back to the test sitekey.
 *
 * @param key - The resolved sitekey value (default-applied or env-supplied)
 * @param appEnv - The `NEXT_PUBLIC_APP_ENV` value at build time
 * @returns `true` when the combination is safe to ship; `false` otherwise
 */
export function isProductionSafeTurnstileKey(
	key: string,
	appEnv: string,
): boolean {
	return !(
		SITEKEY_REQUIRED_ENVS.has(appEnv) && key === CLOUDFLARE_TEST_SITEKEY
	);
}
