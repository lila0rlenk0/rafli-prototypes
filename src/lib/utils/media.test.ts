import { describe, expect, it } from 'bun:test';

import {
	getVideoMimeType,
	getVideoThumbnailUrl,
	isVideoUrl,
	toMediaItem,
} from './media';

describe('isVideoUrl', () => {
	it('returns true for common video extensions', () => {
		expect(isVideoUrl('https://cdn.raffly.win/gallery/abc.mp4')).toBe(true);
		expect(isVideoUrl('https://cdn.raffly.win/gallery/abc.webm')).toBe(true);
		expect(isVideoUrl('https://cdn.raffly.win/gallery/abc.mov')).toBe(true);
		expect(isVideoUrl('https://cdn.raffly.win/gallery/abc.m4v')).toBe(true);
	});

	it('returns false for image extensions', () => {
		expect(isVideoUrl('https://cdn.raffly.win/covers/abc-full.webp')).toBe(
			false,
		);
		expect(isVideoUrl('https://cdn.raffly.win/covers/abc.jpg')).toBe(false);
		expect(isVideoUrl('https://cdn.raffly.win/covers/abc.png')).toBe(false);
	});

	it('is case-insensitive on the extension', () => {
		expect(isVideoUrl('https://cdn.raffly.win/gallery/abc.MP4')).toBe(true);
	});

	it('ignores query string and hash', () => {
		expect(isVideoUrl('https://cdn.raffly.win/g.mp4?token=xyz#t=10')).toBe(
			true,
		);
		expect(isVideoUrl('https://cdn.raffly.win/g.jpg?v=2')).toBe(false);
	});
});

describe('toMediaItem', () => {
	it('classifies videos', () => {
		expect(toMediaItem('https://cdn.raffly.win/g/clip.mp4')).toEqual({
			type: 'video',
			url: 'https://cdn.raffly.win/g/clip.mp4',
		});
	});

	it('classifies images', () => {
		expect(toMediaItem('https://cdn.raffly.win/g/img.webp')).toEqual({
			type: 'image',
			url: 'https://cdn.raffly.win/g/img.webp',
		});
	});
});

describe('getVideoThumbnailUrl', () => {
	it('derives -thumbnail.jpg from mp4', () => {
		expect(getVideoThumbnailUrl('https://cdn.raffly.win/g/clip.mp4')).toBe(
			'https://cdn.raffly.win/g/clip-thumbnail.jpg',
		);
	});

	it('preserves query and hash on the thumbnail URL', () => {
		expect(
			getVideoThumbnailUrl('https://cdn.raffly.win/g/clip.mp4?v=2#t=0'),
		).toBe('https://cdn.raffly.win/g/clip-thumbnail.jpg?v=2#t=0');
	});

	it('returns null for non-video URLs', () => {
		expect(
			getVideoThumbnailUrl('https://cdn.raffly.win/g/img.webp'),
		).toBeNull();
	});
});

describe('getVideoMimeType', () => {
	it('maps extensions to MIME types', () => {
		expect(getVideoMimeType('https://cdn.raffly.win/g/clip.mp4')).toBe(
			'video/mp4',
		);
		expect(getVideoMimeType('https://cdn.raffly.win/g/clip.webm')).toBe(
			'video/webm',
		);
		expect(getVideoMimeType('https://cdn.raffly.win/g/clip.mov')).toBe(
			'video/quicktime',
		);
		expect(getVideoMimeType('https://cdn.raffly.win/g/clip.m4v')).toBe(
			'video/x-m4v',
		);
	});

	it('is case-insensitive', () => {
		expect(getVideoMimeType('https://cdn.raffly.win/g/clip.MP4')).toBe(
			'video/mp4',
		);
	});

	it('ignores query and hash when resolving the extension', () => {
		expect(
			getVideoMimeType('https://cdn.raffly.win/g/clip.mp4?token=xyz#t=10'),
		).toBe('video/mp4');
	});

	it('returns null for non-video URLs', () => {
		expect(getVideoMimeType('https://cdn.raffly.win/g/img.webp')).toBeNull();
	});
});
