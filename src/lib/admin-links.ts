/**
 * Helpers for deep-linking from an embedded app (an iframe on admin.shopify.com)
 * into Shopify admin / the theme editor.
 *
 * Two rules these helpers enforce, both required (see CLAUDE.md "Admin / Theme-Editor
 * Deep Links"):
 *
 *  1. Build the already-resolved https://admin.shopify.com/store/{handle}/... URL.
 *     Linking to {shop}.myshopify.com/admin/... triggers a cross-host redirect that
 *     silently drops the deep-link query params (addAppBlockId, activateAppId,
 *     context=apps, target).
 *  2. Navigate the TOP frame (_top), never window.open(url, '_blank') from the iframe.
 *     _blank from the sandboxed iframe is unreliable (popup blocking / a fresh
 *     top-level navigation back through the redirect).
 *
 * The store handle, your client_id (SHOPIFY_API_KEY) and the shop domain are all
 * available client-side via the `/app` layout data (`data.apiKey`, `data.shop`).
 */

/** shop domain (foo.myshopify.com) -> store handle (foo) */
export function storeHandle(shop: string): string {
	return shop.replace(/\.myshopify\.com$/, '');
}

/** Base admin URL on the modern, already-resolved host. */
export function adminBase(shop: string): string {
	return `https://admin.shopify.com/store/${storeHandle(shop)}`;
}

interface ThemeEditorOpts {
	/** The shop's myshopify domain, e.g. "foo.myshopify.com". */
	shop: string;
	/**
	 * Your app's client_id (exposed client-side as SHOPIFY_API_KEY / layout
	 * `data.apiKey`). NOT the extension uuid — that form is deprecated.
	 */
	apiKey: string;
	/** The block's liquid filename without .liquid (blocks/foo.liquid -> "foo"). */
	handle: string;
}

interface AddAppBlockOpts extends ThemeEditorOpts {
	/** The JSON template to open, e.g. 'index' | 'product' | 'cart'. */
	template: string;
	/**
	 * newAppsSection is the only target ALL JSON templates are guaranteed to
	 * support. mainSection silently falls back on templates whose main section
	 * doesn't accept app blocks (e.g. cart), so we default to the safe one.
	 */
	target?: 'newAppsSection' | 'mainSection';
}

/** Theme-editor deep link that adds an app block to a template. */
export function addAppBlockUrl(opts: AddAppBlockOpts): string {
	const { shop, apiKey, handle, template, target = 'newAppsSection' } = opts;
	return (
		`${adminBase(shop)}/themes/current/editor` +
		`?template=${encodeURIComponent(template)}` +
		`&addAppBlockId=${apiKey}/${handle}` +
		`&target=${target}`
	);
}

/** Theme-editor deep link that activates an app embed. */
export function activateAppEmbedUrl(opts: ThemeEditorOpts): string {
	const { shop, apiKey, handle } = opts;
	return `${adminBase(shop)}/themes/current/editor?context=apps&activateAppId=${apiKey}/${handle}`;
}

/**
 * Navigate to an admin destination from inside the embedded app.
 *
 * Drives the top frame — the documented, reliable primitive for admin links.
 * This replaces the embedded app view with the destination in the same tab;
 * the merchant returns via the browser/admin back button.
 *
 * Prefer a real anchor (`<AdminLink>` / `<a target="_top">`) where you can; use
 * this for programmatic navigation (e.g. inside an onclick handler).
 */
export function openAdminLink(url: string): void {
	window.open(url, '_top');
}
