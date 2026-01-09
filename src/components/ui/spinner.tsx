import { Loader2 } from 'lucide-react';

export function Spinner({ className }: { className?: string }) {
	return <Loader2 className={`size-10 animate-spin opacity-50 ${className}`} />;
}
