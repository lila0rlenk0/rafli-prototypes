import { SignUpForm } from './sign-up-form';

export default function LoginPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="bg-muted relative hidden lg:block">
				<div className="absolute inset-0 size-125 h-full w-full bg-[#B9AF86] object-cover dark:brightness-[0.2] dark:grayscale" />
			</div>
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<SignUpForm />
					</div>
				</div>
			</div>
		</div>
	);
}
