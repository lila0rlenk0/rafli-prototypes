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
import Link from 'next/link';
import { FaGoogle } from 'react-icons/fa';

export function SignInForm({
	className,
	...props
}: React.ComponentProps<'form'>) {
	return (
		<form className={cn('flex flex-col gap-6', className)} {...props}>
			<FieldGroup>
				<div className="font-clash-display flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Ready to sign in?</h1>
					<p className="text-muted-foreground text-sm font-medium text-balance">
						You one step forward to big win!
					</p>
				</div>
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input id="email" type="email" placeholder="m@example.com" required />
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
					/>
				</Field>
				<Field>
					<Button type="submit">Sign In</Button>
				</Field>
				<FieldSeparator>or do it via other accounts</FieldSeparator>
				<Field className="flex flex-col">
					<div className="flex w-full items-center justify-center">
						<Button variant="outline" type="button" className="size-12! w-fit">
							<FaGoogle className="size-6" />
							<span className="sr-only">Login with Google</span>
						</Button>
					</div>
					<FieldDescription className="text-center">
						Don&apos;t have an account?{' '}
						<Link href="/auth/sign-up" className="underline underline-offset-4">
							Sign up
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
