/**
 * Admin URL helpers for billing. Framework-agnostic (pure string builders), used
 * by the SvelteKit app, the worker (over-limit email), and the billing return
 * page. NO $lib/* or $env/* imports.
 */

/** App handle — the `handle` field in shopify.app.toml. */
export const APP_HANDLE = 'order-reviews-google-ratings';

/** shop domain (foo.myshopify.com) -> store handle (foo). */
export function storeHandle(shop: string): string {
	return shop.replace(/\.myshopify\.com$/, '');
}

/** Base admin URL on the modern, already-resolved host. */
export function adminBase(shop: string): string {
	return `https://admin.shopify.com/store/${storeHandle(shop)}`;
}

/**
 * The embedded app's home in Shopify admin. Use this to re-enter the app from a
 * top-frame context (the billing return page) or from an external link (email).
 */
export function appAdminUrl(shop: string): string {
	return `${adminBase(shop)}/apps/${APP_HANDLE}`;
}
