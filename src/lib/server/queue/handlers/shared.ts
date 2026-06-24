/**
 * Shared helpers for the worker email handlers (framework-agnostic).
 */
import { signFeedbackToken } from '../../tokens';
import type { RatingLink } from '../../email/templates';
import type { RatingType } from '../../../shared/db/schema';

export function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * The app's public base URL for feedback links. Prefers an explicit APP_URL
 * env (production), else the URL captured on the review request when the order
 * came in (the live tunnel in dev — no manual APP_URL needed).
 */
export function resolveBaseUrl(captured?: string | null): string {
	const url = process.env.APP_URL || captured;
	if (!url) {
		throw new Error(
			'No app base URL available — set APP_URL, or ensure the order webhook captured the tunnel URL'
		);
	}
	return url.replace(/\/$/, '');
}

/** "foo-bar.myshopify.com" -> "Foo Bar". */
export function prettyStoreName(shop: string, fromName?: string | null): string {
	if (fromName) return fromName;
	const handle = shop.replace(/\.myshopify\.com$/, '');
	return handle
		.split(/[-_]/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

/** One signed landing link per selectable rating (stars 1–5; thumbs down=1, up=5). */
export function buildRatingLinks(
	rid: string,
	ratingType: RatingType,
	capturedBaseUrl?: string | null
): RatingLink[] {
	const values = ratingType === 'thumbs' ? [1, 5] : [1, 2, 3, 4, 5];
	const base = resolveBaseUrl(capturedBaseUrl);
	const now = nowSeconds();
	return values.map((value) => ({ value, url: `${base}/r/${signFeedbackToken(rid, value, now)}` }));
}
