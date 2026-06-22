/**
 * Shopify App Proxy Utilities
 *
 * Handles verification of App Proxy requests from Shopify. App Proxy requests
 * carry a `signature` query param that must be verified against SHOPIFY_API_SECRET.
 *
 * @see https://shopify.dev/docs/apps/build/online-store/display-dynamic-data#calculate-a-digital-signature
 */
import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * Verify the signature of an App Proxy request.
 *
 * Shopify adds these query parameters to App Proxy requests:
 * - shop, timestamp, signature, path_prefix, logged_in_customer_id (optional)
 *
 * The signature is HMAC-SHA256 over all other params, sorted and concatenated.
 */
export function verifyProxySignature(searchParams: URLSearchParams): boolean {
	const signature = searchParams.get('signature');

	if (!signature) {
		console.error('[Proxy] No signature provided');
		return false;
	}

	const apiSecret = env.SHOPIFY_API_SECRET;
	if (!apiSecret) {
		console.error('[Proxy] SHOPIFY_API_SECRET is not configured');
		return false;
	}

	// Build the message: every param except `signature`, sorted, concatenated as key=value
	const params: string[] = [];
	searchParams.forEach((value, key) => {
		if (key !== 'signature') {
			params.push(`${key}=${value}`);
		}
	});
	params.sort();
	const message = params.join('');

	const calculated = createHmac('sha256', apiSecret).update(message).digest('hex');

	const isValid = timingSafeEqualHex(signature, calculated);
	if (!isValid) {
		console.error('[Proxy] Invalid signature');
	}
	return isValid;
}

/** Timing-safe comparison of two hex strings of equal length. */
function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	try {
		return nodeTimingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
	} catch {
		return false;
	}
}

/** Extract shop domain from an App Proxy request. */
export function getShopFromProxy(searchParams: URLSearchParams): string | null {
	return searchParams.get('shop');
}

/** Extract customer ID from an App Proxy request (if the customer is logged in). */
export function getCustomerIdFromProxy(searchParams: URLSearchParams): string | null {
	return searchParams.get('logged_in_customer_id');
}
