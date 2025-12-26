'use client';

import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { registerUser } from '@/services/auth/register-user';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { FaGoogle } from 'react-icons/fa';
import z from 'zod';

const formSchema = z.object({
	name: z.string().min(3, 'Name must be at least 3 characters').max(50),
	email: z.email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters').max(50),
});

type FormType = z.infer<typeof formSchema>;

export function SignUpForm({ className, ...props }: ComponentProps<'form'>) {
	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormType>({
		resolver: zodResolver(formSchema),
	});
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	async function handleSignUp(data: FormType) {
		startTransition(async () => {
			const result = await registerUser(data);

			if (result.error) {
				setError('root', { message: result.error });
				return;
			}

			router.push('/sign-in');
		});
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			{...props}
			onSubmit={handleSubmit(handleSignUp)}
		>
			<FieldGroup className="gap-3">
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Create your account</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
						You one step forward to big win!
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="name">Name</FieldLabel>
					<Input
						id="name"
						type="text"
						placeholder="John Doe"
						required
						aria-invalid={!!errors.name}
						aria-describedby={errors.name ? 'name-error' : undefined}
						{...register('name')}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="m@example.com"
						required
						aria-invalid={!!errors.email}
						aria-describedby={errors.email ? 'email-error' : undefined}
						{...register('email')}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						id="password"
						type="password"
						placeholder="********"
						required
						aria-invalid={!!errors.password}
						aria-describedby={errors.password ? 'password-error' : undefined}
						{...register('password')}
					/>
				</Field>
				{errors.root && (
					<div className="text-sm text-red-600">{errors.root.message}</div>
				)}
				<Field className="mt-4">
					<Button type="submit" disabled={isPending}>
						{isPending ? 'Creating account...' : 'Sign Up'}
					</Button>
				</Field>
				<FieldSeparator className="my-1">
					or do it via other accounts
				</FieldSeparator>
				<Field className="flex flex-col gap-4">
					<div className="flex w-full items-center justify-center">
						<Button variant="outline" type="button" className="size-12! w-fit">
							<FaGoogle className="size-6" />
							<span className="sr-only">Login with Google</span>
						</Button>
					</div>
					<FieldDescription className="text-center">
						Don&apos;t have an account?{' '}
						<Link href="/sign-in" className="underline underline-offset-4">
							Sign in
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
