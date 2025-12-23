import Image from 'next/image';
import { SignUpForm } from './sign-up-form';

export default function LoginPage() {
	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			<div className="bg-muted relative hidden lg:block">
				<Image
					src="/placeholder.svg"
					alt="Image"
					className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
					width={500}
					height={500}
				/>
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
