'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';

/**
 * Credential field shape shared with `sign-up-form`. Kept here rather
 * than in an external schema module because the fields, schema, and
 * submit handler live together in the sign-up domain.
 */
export interface SignUpFields {
	name: string;
	email: string;
	password: string;
}

interface SignUpCredentialFieldsProps {
	register: UseFormRegister<SignUpFields>;
	errors: FieldErrors<SignUpFields>;
}

/**
 * Name / email / password inputs for the sign-up form. Pulled out so the
 * form shell stays under the function-length cap and the field group can
 * be reused by a future "admin creates user" flow without duplication.
 */
export function SignUpCredentialFields({
	register,
	errors,
}: SignUpCredentialFieldsProps) {
	return (
		<>
			<Field>
				<FieldLabel htmlFor="name">Name</FieldLabel>
				<Input
					id="name"
					type="text"
					placeholder="John Doe"
					required
					aria-invalid={!!errors.name}
					{...register('name')}
				/>
				<FieldError errors={[errors.name]} />
			</Field>
			<Field>
				<FieldLabel htmlFor="email">Email</FieldLabel>
				<Input
					id="email"
					type="email"
					placeholder="m@example.com"
					required
					aria-invalid={!!errors.email}
					{...register('email')}
				/>
				<FieldError errors={[errors.email]} />
			</Field>
			<Field>
				<FieldLabel htmlFor="password">Password</FieldLabel>
				<PasswordInput
					id="password"
					placeholder="********"
					required
					aria-invalid={!!errors.password}
					{...register('password')}
				/>
				<FieldError errors={[errors.password]} />
			</Field>
		</>
	);
}
