/**
 * Cloudflare's public "always-pass" Turnstile sitekey. Documented for local
 * dev + CI use only — see https://developers.cloudflare.com/turnstile/troubleshooting/testing/.
 * Shipping it in a production build is a quiet failure mode: paired with a
 * real Turnstile secret on the backend it produces 100% captcha rejections
 * (auth DoS); paired with the matching test secret it silently bypasses the
 * captcha middleware entirely (security regression).
 */
export const CLOUDFLARE_TEST_SITEKEY = '1x00000000000000000000AA';

/**
 * Asserts the configured Turnstile sitekey is safe for the given app
 * environment. Used as the trust boundary in `@/env/client` so the build
 * fails loudly when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing in
 * production and the schema falls back to the test sitekey.
 *
 * The check is intentionally narrow — only "production" + test key is
 * rejected. Staging / development keep using the test key by default so
 * local builds and preview deploys do not require ops to provision a real
 * key per environment.
 *
 * @param key - The resolved sitekey value (default-applied or env-supplied)
 * @param appEnv - The `NEXT_PUBLIC_APP_ENV` value at build time
 * @returns `true` when the combination is safe to ship; `false` otherwise
 */
export function isProductionSafeTurnstileKey(
	key: string,
	appEnv: string,
): boolean {
	return !(appEnv === 'production' && key === CLOUDFLARE_TEST_SITEKEY);
}
