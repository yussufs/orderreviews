import type { RequestHandler } from './$types';
import { shopify } from '$lib/server/shopify';

/**
 * Bounce page for embedded apps.
 * When a document-level request hits /app/* without a session token (e.g. initial
 * iframe load or page refresh), the hooks redirect here. This page loads App Bridge,
 * which obtains a fresh session token and redirects back to the original route.
 */
export const GET: RequestHandler = async ({ url }) => {
	const apiKey = shopify.api.config.apiKey;

	const html = `<!DOCTYPE html>
<html>
<head>
	<meta name="shopify-api-key" content="${apiKey}" />
	<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body></body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html',
			'Content-Security-Policy': `frame-ancestors https://admin.shopify.com https://*.myshopify.com;`
		}
	});
};
