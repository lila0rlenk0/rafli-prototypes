import { test, expect } from '@playwright/test';

/**
 * @backend-contract — optional live API checks. Configure `.env.test`:
 *   BACKEND_CONTRACT_BASE_URL — `https://host/api/v1`
 *   BACKEND_CONTRACT_BEARER — JWT user A
 *   BACKEND_CONTRACT_PEER_SUBMISSION_ID — foreign KYC id (optional)
 */
const API = process.env.BACKEND_CONTRACT_BASE_URL;
const BEARER = process.env.BACKEND_CONTRACT_BEARER;
const PEER_SUBMISSION = process.env.BACKEND_CONTRACT_PEER_SUBMISSION_ID;

test.describe('backend contract @backend-contract', () => {
	test('GET /me rejects forged bearer when API base is configured', async ({
		request,
	}) => {
		if (!API) {
			expect(true).toBe(true);
			return;
		}
		const forged =
			'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4IiwiZW1haWwiOiJ4QHguY29tIiwiZW1haWxWZXJpZmllZCI6dHJ1ZSwibmFtZSI6IngiLCJleHAiOjk5OTk5OTk5OTl9.abc';
		const r = await request.get(`${API}/me`, {
			headers: { Authorization: `Bearer ${forged}` },
		});
		expect(r.status(), 'forged JWT must not return 200').not.toBe(200);
	});

	test('GET /verification/:id not 200 for peer submission when fully configured', async ({
		request,
	}) => {
		if (!API || !BEARER || !PEER_SUBMISSION) {
			expect(true).toBe(true);
			return;
		}
		const r = await request.get(`${API}/verification/${PEER_SUBMISSION}`, {
			headers: { Authorization: `Bearer ${BEARER}` },
		});
		expect([403, 404], 'IDOR: must not 200 for foreign submission').toContain(
			r.status(),
		);
	});
});
