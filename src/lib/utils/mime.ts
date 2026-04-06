/**
 * Checks if a MIME content type represents a displayable image.
 *
 * @returns true for image/* types
 */
export function isImageType(contentType: string): boolean {
	return getNormalizedMimeType(contentType).startsWith('image/');
}

/**
 * Checks whether a MIME content type represents a PDF.
 *
 * Handles optional MIME parameters (for example `application/pdf; charset=utf-8`).
 *
 * @returns true for application/pdf
 */
export function isPdfType(contentType: string): boolean {
	return getNormalizedMimeType(contentType) === 'application/pdf';
}

/**
 * Builds a PDF preview URL with browser viewer controls configured.
 *
 * @returns URL with PDF viewer hash params appended
 */
export function getPdfPreviewUrl(url: string): string {
	const [baseUrl] = url.split('#');
	return `${baseUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}

/**
 * Normalizes MIME strings so content checks stay reliable across browsers/APIs.
 *
 * @returns Lower-cased MIME type without parameters
 */
function getNormalizedMimeType(contentType: string): string {
	return contentType.split(';')[0].trim().toLowerCase();
}
