import { describe, expect, test } from 'bun:test';

import { VERIFICATION_TYPE } from '@/types/kyc-submission';

import {
	DOC_TYPE_KIND,
	resolveDocTypeFieldName,
	shouldCollectAddressDoc,
} from './use-doc-type-field';

// Pure-derivation tests — the hook itself binds RHF, but `resolveDocTypeFieldName`
// and `shouldCollectAddressDoc` are pure switches. Covering them here pins
// the exhaustiveness contract: if a new `DocTypeKind` or `VerificationType`
// literal is introduced without updating these helpers, both compile-time
// exhaustive checks and these runtime cases fail.

describe('resolveDocTypeFieldName', () => {
	describe('kind → field-name mapping', () => {
		test('maps IDENTITY to the identityDocType field', () => {
			expect(resolveDocTypeFieldName(DOC_TYPE_KIND.IDENTITY)).toBe(
				'identityDocType',
			);
		});

		test('maps ADDRESS to the addressDocType field', () => {
			expect(resolveDocTypeFieldName(DOC_TYPE_KIND.ADDRESS)).toBe(
				'addressDocType',
			);
		});
	});
});

describe('shouldCollectAddressDoc', () => {
	describe('per-verification-type rule', () => {
		test('KYB individual hosts collect an address document', () => {
			expect(shouldCollectAddressDoc(VERIFICATION_TYPE.KYB_INDIVIDUAL)).toBe(
				true,
			);
		});

		test('KYB company hosts do not collect an address document at step 1', () => {
			// Company hosts submit business documents in the uploads step instead —
			// they never pick an address-proof type alongside identity.
			expect(shouldCollectAddressDoc(VERIFICATION_TYPE.KYB_COMPANY)).toBe(
				false,
			);
		});

		test('KYC winners do not collect an address document', () => {
			// Winners only upload identity — their shipping address is collected
			// via the address fieldset on the same step, not an address-proof doc.
			expect(shouldCollectAddressDoc(VERIFICATION_TYPE.KYC_WINNER)).toBe(false);
		});
	});

	describe('null fallback', () => {
		test('returns false when no verification type is selected yet', () => {
			// Step 0 state — user hasn't picked a verification type, so the
			// downstream selects aren't rendered at all.
			expect(shouldCollectAddressDoc(null)).toBe(false);
		});
	});
});
