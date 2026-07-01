import '@shopify/shopify-api/adapters/web-api';
import { shopifyApi, ApiVersion, Session, type Shopify } from '@shopify/shopify-api';
import { DrizzleSessionStorage } from './session-storage';
import { env } from '$env/dynamic/private';

// Get environment variable with fallback
function getEnvVar(name: string, fallback?: string): string {
	const value = env[name];
	if (!value && !fallback) throw new Error(`${name} environment variable is required`);
	return value || fallback || '';
}

// Get app URL - Shopify CLI sets HOST or SHOPIFY_APP_URL
function getAppUrl(): string {
	// Shopify CLI sets HOST (deprecated) or SHOPIFY_APP_URL
	const appUrl = env.SHOPIFY_APP_URL || env.HOST;
	if (!appUrl) throw new Error('SHOPIFY_APP_URL or HOST environment variable is required');
	return appUrl;
}

/**
 * Resolve the app's public base URL without throwing. Prefers the deployed
 * SHOPIFY_APP_URL, falling back to the CLI-injected HOST (set during
 * `shopify app dev`). Used to capture the current tunnel URL on each order so
 * the worker can build feedback-email links without a hand-set URL in dev.
 *
 * Normalizes the value into a valid absolute origin: some hosts inject `HOST`
 * (and occasionally `SHOPIFY_APP_URL`) as a bare hostname with no scheme, which
 * produces an invalid URL when composed into a return/callback link (e.g. the
 * Billing API rejects it with "Variable $returnUrl of type URL! was provided
 * invalid value"). Returns `null` if no usable value is configured.
 */
export function resolveAppBaseUrl(): string | null {
	const raw = (env.SHOPIFY_APP_URL || env.HOST || '').trim();
	if (!raw) return null;
	const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
	try {
		// Collapse to a clean origin (scheme + host[:port]) and drop any trailing slash.
		return new URL(withScheme).origin;
	} catch {
		return null;
	}
}

let sessionStorageInstance: DrizzleSessionStorage | null = null;

function createShopifyApi(): Shopify {
	const appUrl = getAppUrl();
	const hostName = new URL(appUrl).hostname;

	return shopifyApi({
		apiKey: getEnvVar('SHOPIFY_API_KEY'),
		apiSecretKey: getEnvVar('SHOPIFY_API_SECRET'),
		scopes: getEnvVar('SCOPES').split(','),
		hostName: hostName,
		hostScheme: 'https',
		apiVersion: ApiVersion.October25,
		isEmbeddedApp: true
	});
}

// Create fresh instance each time to avoid stale config in development
function getShopify(): Shopify {
	return createShopifyApi();
}

function getSessionStorage(): DrizzleSessionStorage {
	if (!sessionStorageInstance) {
		sessionStorageInstance = new DrizzleSessionStorage();
	}
	return sessionStorageInstance;
}

// Export getters to allow lazy initialization
export const shopify = {
	get api() {
		return getShopify();
	},
	get sessionStorage() {
		return getSessionStorage();
	}
};

// Helper to get offline session ID for a shop
export function getOfflineSessionId(shop: string): string {
	return getShopify().session.getOfflineId(shop);
}

// Helper to create GraphQL client for a session
export function createAdminApiClient(session: Session) {
	return new (getShopify().clients.Graphql)({ session });
}

// Helper to create REST client for a session
export function createRestClient(session: Session) {
	return new (getShopify().clients.Rest)({ session });
}

export { ApiVersion, Session };
