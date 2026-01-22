import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { shopify, Session } from '$lib/server/shopify';
import crypto from 'crypto';

/**
 * Verify a signed state parameter.
 * Returns the shop from the state if valid, null otherwise.
 */
function verifySignedState(
	state: string,
	expectedShop: string,
	apiSecret: string
): { valid: boolean; reason?: string } {
	try {
		const decoded = Buffer.from(state, 'base64url').toString('utf-8');
		const parts = decoded.split(':');
		if (parts.length !== 4) {
			return { valid: false, reason: 'malformed_state' };
		}

		const [shop, timestamp, nonce, signature] = parts;
		const payload = `${shop}:${timestamp}:${nonce}`;
		const expectedSignature = crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');

		// Verify signature using timing-safe comparison
		if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
			return { valid: false, reason: 'invalid_signature' };
		}

		// Verify shop matches
		if (shop !== expectedShop) {
			return { valid: false, reason: 'shop_mismatch' };
		}

		// Verify timestamp is not too old (10 minutes)
		const stateTime = parseInt(timestamp, 10);
		const now = Date.now();
		if (isNaN(stateTime) || now - stateTime > 10 * 60 * 1000) {
			return { valid: false, reason: 'state_expired' };
		}

		return { valid: true };
	} catch {
		return { valid: false, reason: 'decode_error' };
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const shop = url.searchParams.get('shop');
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const host = url.searchParams.get('host');

	// Validate required parameters
	if (!shop || !code || !state) {
		error(400, 'Missing required OAuth parameters');
	}

	// Verify signed state (CSRF protection without cookies)
	const config = shopify.api.config;
	const stateResult = verifySignedState(state, shop, config.apiSecretKey);
	if (!stateResult.valid) {
		console.error('State verification failed:', stateResult.reason);
		error(400, 'Invalid state parameter');
	}

	try {
		// Exchange authorization code for access token
		const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				client_id: config.apiKey,
				client_secret: config.apiSecretKey,
				code
			})
		});

		if (!tokenResponse.ok) {
			console.error('Token exchange failed:', await tokenResponse.text());
			error(400, 'Failed to exchange authorization code');
		}

		const tokenData = (await tokenResponse.json()) as {
			access_token: string;
			scope: string;
		};

		// Create and store session
		const sessionId = shopify.api.session.getOfflineId(shop);
		const session = new Session({
			id: sessionId,
			shop,
			state,
			isOnline: false,
			accessToken: tokenData.access_token,
			scope: tokenData.scope
		});

		await shopify.sessionStorage.storeSession(session);

		// Redirect to app page with shop and host params
		const appUrl = env.SHOPIFY_APP_URL || env.HOST || `https://${config.hostName}`;
		const redirectUrl = new URL('/app', appUrl);
		redirectUrl.searchParams.set('shop', shop);
		if (host) {
			redirectUrl.searchParams.set('host', host);
		}

		redirect(302, redirectUrl.toString());
	} catch (err) {
		// Re-throw SvelteKit redirects and errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('OAuth callback error:', err);
		redirect(302, `/auth/login?error=${encodeURIComponent('OAuth failed. Please try again.')}`);
	}
};
