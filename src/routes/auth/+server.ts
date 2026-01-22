import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { shopify } from '$lib/server/shopify';
import crypto from 'crypto';

/**
 * Create a signed state parameter for OAuth CSRF protection.
 * Encodes shop, timestamp, and a nonce, signed with the API secret.
 * This avoids reliance on cookies which can be blocked by browsers.
 */
function createSignedState(shop: string, apiSecret: string): string {
	const nonce = crypto.randomBytes(16).toString('hex');
	const timestamp = Date.now().toString();
	const payload = `${shop}:${timestamp}:${nonce}`;
	const signature = crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');
	// Encode as base64url to ensure URL-safe characters
	return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export const GET: RequestHandler = async ({ url }) => {
	const shop = url.searchParams.get('shop');

	if (!shop) {
		redirect(302, '/auth/login');
	}

	// Validate shop domain format
	if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
		redirect(302, '/auth/login?error=invalid_shop');
	}

	const config = shopify.api.config;

	// Generate signed state for CSRF protection (no cookies needed)
	const state = createSignedState(shop, config.apiSecretKey);

	const scopes = config.scopes?.toString() || '';
	const hostName = config.hostName;
	const redirectUri = `https://${hostName}/auth/callback`;

	const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
	authUrl.searchParams.set('client_id', config.apiKey);
	authUrl.searchParams.set('scope', scopes);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('state', state);

	redirect(302, authUrl.toString());
};
