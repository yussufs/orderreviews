/**
 * Utility functions for the Google Reviews Widget
 */

/**
 * Calculate relative time string from a date
 */
export function getTimeAgo(date: string): string {
	const now = new Date();
	const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

	const intervals = [
		{ label: 'year', seconds: 31536000 },
		{ label: 'month', seconds: 2592000 },
		{ label: 'day', seconds: 86400 },
		{ label: 'hour', seconds: 3600 },
		{ label: 'minute', seconds: 60 }
	];

	for (const { label, seconds: unit } of intervals) {
		const count = Math.floor(seconds / unit);
		if (count >= 1) {
			return count === 1 ? `1 ${label} ago` : `${count} ${label}s ago`;
		}
	}

	return `${seconds} seconds ago`;
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength).trim() + '...';
}

/**
 * Google's image CDN serves any photo at an arbitrary size via a suffix on the
 * final path segment (e.g. `...=s128` or `...=w640`). Apify hands us the
 * unsized/original URL, so without this the browser downloads a multi-megapixel
 * file only to paint it at ~40px. Rewriting the suffix asks Google for a
 * right-sized image instead.
 */
const GOOGLE_IMAGE_HOST = /(?:googleusercontent\.com|ggpht\.com|gstatic\.com)/i;

export function resizeGoogleImage(
	url: string | undefined | null,
	opts: { size?: number; width?: number; height?: number }
): string {
	if (!url || !GOOGLE_IMAGE_HOST.test(url)) return url || '';

	const lastSlash = url.lastIndexOf('/');
	if (lastSlash === -1) return url;
	const head = url.slice(0, lastSlash + 1);
	const tail = url.slice(lastSlash + 1);

	// Signed/query URLs don't use the path-suffix sizing scheme; leave them be.
	if (tail.includes('?')) return url;

	let token: string;
	if (opts.size) {
		token = `s${opts.size}`;
	} else {
		token = [opts.width ? `w${opts.width}` : null, opts.height ? `h${opts.height}` : null]
			.filter(Boolean)
			.join('-');
	}
	if (!token) return url;

	const eq = tail.indexOf('=');
	const base = eq === -1 ? tail : tail.slice(0, eq);
	return `${head}${base}=${token}`;
}

/**
 * Get initials from a name (for avatar fallback)
 */
export function getInitials(name: string): string {
	return name
		.split(' ')
		.map((word) => word[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

/**
 * Format a star rating number for display
 */
export function formatRating(rating: number): string {
	return rating.toFixed(1);
}

/**
 * Parse display settings from element attributes
 * Attributes prefixed with "display-" become displaySettings properties
 */
export function parseDisplaySettings(element: HTMLElement): Record<string, unknown> {
	const prefix = 'display-';
	const displaySettings: Record<string, unknown> = {};

	for (const attr of element.attributes) {
		if (attr.name.startsWith(prefix)) {
			let value: unknown = attr.value;
			// Try to cast to boolean, number, or leave as string
			if (value === 'true') {
				value = true;
			} else if (value === 'false') {
				value = false;
			} else if (!isNaN(Number(value)) && (value as string).trim() !== '') {
				value = Number(value);
			}
			displaySettings[attr.name.slice(prefix.length)] = value;
		}
	}
	return displaySettings;
}
