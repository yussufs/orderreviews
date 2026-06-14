import type { RequestEvent } from '@sveltejs/kit';
import { RequestedTokenType } from '@shopify/shopify-api';
import { shopify, getOfflineSessionId, Session } from '$lib/server/shopify';
import { createAdmin, type AdminClient } from '$lib/server/shopify/graphql';

export interface AuthResult {
	session: Session;
	admin: AdminClient;
}

/**
 * Treat an access token as expired this many milliseconds before its real
 * expiry, so we refresh/re-exchange slightly early rather than mid-request.
 */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Authenticate a request using a session token.
 * Accepts the token from either the Authorization header (Bearer) or directly.
 * If no offline session exists (or scopes are insufficient), performs token exchange
 * to obtain an offline access token from Shopify.
 */
export async function authenticateRequest(request: Request, idToken?: string): Promise<AuthResult> {
	let token = idToken;

	if (!token) {
		const authHeader = request.headers.get('authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			throw new AuthError('missing_token', 'No session token available');
		}
		token = authHeader.substring(7);
	}
	const payload = await shopify.api.session.decodeSessionToken(token);
	const shop = payload.dest.replace('https://', '');
	const sessionId = getOfflineSessionId(shop);

	// Load any existing offline session for this shop.
	let session = await shopify.sessionStorage.loadSession(sessionId);

	// A stored session is only usable if it holds an *expiring*-token refresh
	// token, a non-expired access token (with buffer), and the currently required
	// scopes. Legacy non-expiring tokens have no refreshToken and must be
	// re-issued. Because every embedded request carries an id_token, we can simply
	// re-run token exchange whenever the stored session falls short — no separate
	// refresh logic is needed on this path.
	const requiredScopes = shopify.api.config.scopes;
	if (!session?.refreshToken || !session.isActive(requiredScopes, EXPIRY_BUFFER_MS)) {
		session = await performTokenExchange(shop, token);
	}

	const admin = createAdmin(session);
	return { session, admin };
}

/**
 * Token exchange — obtain a fresh *expiring* offline access token (plus a
 * refresh token) for a shop using the request's session token (id_token).
 *
 * The `expiring: true` flag is required: without it Shopify still issues a
 * legacy non-expiring token, which is being retired for the Admin API.
 *
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange
 */
async function performTokenExchange(shop: string, sessionToken: string): Promise<Session> {
	try {
		const { session } = await shopify.api.auth.tokenExchange({
			shop,
			sessionToken,
			requestedTokenType: RequestedTokenType.OfflineAccessToken,
			expiring: true
		});
		await shopify.sessionStorage.storeSession(session);
		return session;
	} catch (err) {
		console.error(`Token exchange failed for ${shop}:`, err);
		throw new AuthError('token_exchange_failed', `Token exchange failed for ${shop}`);
	}
}

/**
 * Get a valid offline session for **background work** (webhooks, cron jobs,
 * queue workers) where no id_token is available, so token exchange isn't an
 * option. Every background admin-client factory should go through this.
 *
 * Resolution order:
 *  1. No stored session → throw (merchant must reopen the app).
 *  2. Legacy non-expiring token (no refreshToken) → migrate it in place to an
 *     expiring token. One-time, irreversible, no merchant interaction.
 *  3. Access token still valid (with buffer) → return as-is.
 *  4. Access token expired/expiring → refresh it, provided the 90-day refresh
 *     token is still valid; otherwise throw (merchant must reopen the app).
 *
 * Token rotation: each refresh invalidates the previous refresh token, and
 * `storeSession` writes the new access + refresh token in a single atomic upsert
 * so a rotated token is never lost. On multi-instance deployments, wrap the
 * refresh in a per-shop lock (e.g. a Postgres advisory lock) so concurrent
 * workers don't race. A single instance needs no lock.
 */
export async function getOfflineSession(shop: string): Promise<Session> {
	const sessionId = getOfflineSessionId(shop);
	const session = await shopify.sessionStorage.loadSession(sessionId);

	if (!session?.accessToken) {
		throw new AuthError(
			'no_session',
			`No offline session for ${shop}; merchant must reopen the app`
		);
	}

	// Legacy non-expiring token → migrate in place.
	if (!session.refreshToken) {
		const { session: migrated } = await shopify.api.auth.migrateToExpiringToken({
			shop,
			nonExpiringOfflineAccessToken: session.accessToken
		});
		await shopify.sessionStorage.storeSession(migrated);
		return migrated;
	}

	// Access token still valid → use as-is.
	if (!session.isExpired(EXPIRY_BUFFER_MS)) {
		return session;
	}

	// Access token expired/expiring → refresh, if the refresh token is still valid.
	if (session.refreshTokenExpires && session.refreshTokenExpires.getTime() <= Date.now()) {
		throw new AuthError(
			'refresh_token_expired',
			`Refresh token for ${shop} has expired; merchant must reopen the app`
		);
	}

	try {
		const { session: refreshed } = await shopify.api.auth.refreshToken({
			shop,
			refreshToken: session.refreshToken
		});
		await shopify.sessionStorage.storeSession(refreshed);
		return refreshed;
	} catch (err) {
		console.error(`Token refresh failed for ${shop}:`, err);
		throw new AuthError(
			'refresh_failed',
			`Could not refresh token for ${shop}; merchant must reopen the app`
		);
	}
}

/**
 * Extract shop domain from request query params or host param.
 */
export function getShopFromRequest(event: RequestEvent): string | null {
	const shop = event.url.searchParams.get('shop');
	if (shop) return shop;

	const host = event.url.searchParams.get('host');
	if (host) {
		try {
			const decoded = atob(host);
			const match = decoded.match(/([^/]+\.myshopify\.com)/);
			if (match) return match[1];
		} catch {
			// Invalid base64
		}
	}

	return null;
}

export class AuthError extends Error {
	constructor(
		public code: string,
		message: string
	) {
		super(message);
		this.name = 'AuthError';
	}
}
