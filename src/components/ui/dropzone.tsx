'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/class-names';
import { UploadIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { DropEvent, DropzoneOptions, FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';

type DropzoneContextType = {
	src?: File[];
	accept?: DropzoneOptions['accept'];
	maxSize?: DropzoneOptions['maxSize'];
	minSize?: DropzoneOptions['minSize'];
	maxFiles?: DropzoneOptions['maxFiles'];
	/** Optional hint shown inside the dropzone (e.g. dimension recommendation) */
	hint?: string;
};

const renderBytes = (bytes: number) => {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(
	undefined,
);

export type DropzoneProps = Omit<DropzoneOptions, 'onDrop'> & {
	src?: File[];
	className?: string;
	/** Optional hint shown inside the dropzone (e.g. "Recommended: 1200×675px") */
	hint?: string;
	onDrop?: (
		acceptedFiles: File[],
		fileRejections: FileRejection[],
		event: DropEvent,
	) => void;
	children?: ReactNode;
};

export const Dropzone = ({
	accept,
	maxFiles = 1,
	maxSize,
	minSize,
	onDrop,
	onError,
	disabled,
	src,
	className,
	hint,
	children,
	...props
}: DropzoneProps) => {
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		accept,
		maxFiles,
		maxSize,
		minSize,
		onError,
		disabled,
		onDrop: (acceptedFiles, fileRejections, event) => {
			if (fileRejections.length > 0) {
				const message = fileRejections.at(0)?.errors.at(0)?.message;
				onError?.(new Error(message));
				return;
			}

			onDrop?.(acceptedFiles, fileRejections, event);
		},
		...props,
	});

	return (
		<DropzoneContext.Provider
			key={JSON.stringify(src)}
			value={{ src, accept, maxSize, minSize, maxFiles, hint }}
		>
			<Button
				className={cn(
					'hover:bg-background relative h-auto w-full cursor-pointer flex-col overflow-hidden p-8 hover:border-gray-400',
					isDragActive && 'ring-ring ring-1 outline-none',
					className,
				)}
				disabled={disabled}
				type="button"
				variant="outline"
				{...getRootProps()}
			>
				<input {...getInputProps()} disabled={disabled} />
				{children}
			</Button>
		</DropzoneContext.Provider>
	);
};

const useDropzoneContext = () => {
	const context = useContext(DropzoneContext);

	if (!context) {
		throw new Error('useDropzoneContext must be used within a Dropzone');
	}

	return context;
};

export type DropzoneContentProps = {
	children?: ReactNode;
	className?: string;
};

const maxLabelItems = 3;

export const DropzoneContent = ({
	children,
	className,
}: DropzoneContentProps) => {
	const { src, hint } = useDropzoneContext();

	if (!src) {
		return null;
	}

	if (children) {
		return children;
	}

	return (
		<div className={cn('flex flex-col items-center justify-center', className)}>
			<p className="my-2 h-5 w-full truncate text-sm font-medium">
				{src.length > maxLabelItems
					? `${new Intl.ListFormat('en').format(
							src.slice(0, maxLabelItems).map(file => file.name),
						)} and ${src.length - maxLabelItems} more`
					: new Intl.ListFormat('en').format(src.map(file => file.name))}
			</p>
			<p className="text-muted-foreground w-full text-xs text-wrap">
				Click to upload or drag an drop
			</p>
			<p className="text-muted-foreground w-full text-xs text-wrap">
				PNG, JPEG, WebP up to 5MB
			</p>
			{hint ? (
				<p className="text-muted-foreground mt-1 text-xs text-wrap">{hint}</p>
			) : null}
		</div>
	);
};

export type DropzoneEmptyStateProps = {
	children?: ReactNode;
	className?: string;
};

export const DropzoneEmptyState = ({
	children,
	className,
}: DropzoneEmptyStateProps) => {
	const { src, accept, maxSize, minSize, maxFiles, hint } =
		useDropzoneContext();

	if (src) {
		return null;
	}

	if (children) {
		return children;
	}

	let caption = '';

	if (accept) {
		caption += 'Accepts ';
		caption += new Intl.ListFormat('en').format(Object.keys(accept));
	}

	if (minSize && maxSize) {
		caption += ` between ${renderBytes(minSize)} and ${renderBytes(maxSize)}`;
	} else if (minSize) {
		caption += ` at least ${renderBytes(minSize)}`;
	} else if (maxSize) {
		caption += ` less than ${renderBytes(maxSize)}`;
	}

	return (
		<div className={cn('flex flex-col items-center justify-center', className)}>
			<div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
				<UploadIcon size={16} />
			</div>
			<p className="my-2 w-full truncate text-sm font-medium text-wrap">
				Upload {maxFiles === 1 ? 'a file' : 'files'}
			</p>
			<p className="text-muted-foreground w-full truncate text-xs text-wrap">
				Drag and drop or click to upload
			</p>
			{caption ? (
				<p className="text-muted-foreground text-xs text-wrap">{caption}.</p>
			) : null}
			{hint ? (
				<p className="text-muted-foreground mt-1 text-xs text-wrap">{hint}</p>
			) : null}
		</div>
	);
};
