/**
 * Checks if a MIME content type represents a displayable image.
 *
 * @returns true for image/* types
 */
export function isImageType(contentType: string): boolean {
	return contentType.startsWith('image/');
}
