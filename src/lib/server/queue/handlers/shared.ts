/**
 * Shared helpers for the worker email handlers (framework-agnostic).
 */
import { signFeedbackToken } from '../../tokens';
import type { RatingLink } from '../../email/templates';
import type { RatingType } from '../../../shared/db/schema';

export function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
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

/**
 * One signed landing link per selectable rating (stars 1–5; thumbs down=1, up=5).
 * Links point at the merchant's storefront via the App Proxy so every customer
 * touchpoint lives on the store's own domain.
 */
export function buildRatingLinks(rid: string, ratingType: RatingType, shop: string): RatingLink[] {
	const values = ratingType === 'thumbs' ? [1, 5] : [1, 2, 3, 4, 5];
	const now = nowSeconds();
	return values.map((value) => ({
		value,
		url: `https://${shop}/apps/order-reviews/r/${signFeedbackToken(rid, value, now)}`
	}));
}
