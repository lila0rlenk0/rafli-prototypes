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
import { signInUser } from '@/services/auth/sign-in-user';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { FaGoogle } from 'react-icons/fa';
import z from 'zod';

const formSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters').max(50),
});

type FormType = z.infer<typeof formSchema>;

export function SignInForm({ className, ...props }: ComponentProps<'form'>) {
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

	async function handleSignIn(data: FormType) {
		startTransition(async () => {
			const result = await signInUser(data);

			if (result.error) {
				setError('root', { message: result.error });
				return;
			}

			// Success - redirect to dashboard
			router.push('/browse');
			router.refresh();
		});
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			{...props}
			onSubmit={handleSubmit(handleSignIn)}
		>
			<FieldGroup className="gap-3">
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Ready to sign in?</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
						You one step forward to big win!
					</p>
				</div>
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
					<div className="flex items-center">
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<a
							href="#"
							className="ml-auto text-sm underline-offset-4 hover:underline"
						>
							Forgot your password?
						</a>
					</div>
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
						{isPending ? 'Signing in...' : 'Sign In'}
					</Button>
				</Field>
				<FieldSeparator className="my-2">
					or do it via other accounts
				</FieldSeparator>
				<Field className="flex flex-col space-y-2">
					<div className="flex w-full items-center justify-center">
						<Button variant="outline" type="button" className="size-12! w-fit">
							<FaGoogle className="size-6" />
							<span className="sr-only">Login with Google</span>
						</Button>
					</div>
					<FieldDescription className="text-center">
						Don&apos;t have an account?{' '}
						<Link href="/sign-up" className="underline underline-offset-4">
							Sign up
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
