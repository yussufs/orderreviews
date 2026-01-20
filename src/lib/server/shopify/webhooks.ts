import crypto from 'crypto';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export interface WebhookContext<T = unknown> {
	shop: string;
	topic: string;
	payload: T;
	rawBody: string;
}

/**
 * Authenticate and validate a Shopify webhook request
 * Throws SvelteKit error with appropriate status if validation fails
 *
 * @see https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
 */
export async function authenticateWebhook<T = unknown>(
	request: Request
): Promise<WebhookContext<T>> {
	const rawBody = await request.text();
	const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
	const shop = request.headers.get('x-shopify-shop-domain');
	const topic = request.headers.get('x-shopify-topic');

	// Validate required headers
	if (!hmacHeader) {
		console.error('Webhook validation failed: Missing HMAC header');
		error(401, 'Unauthorized');
	}

	if (!shop) {
		console.error('Webhook validation failed: Missing shop domain header');
		error(401, 'Unauthorized');
	}

	if (!topic) {
		console.error('Webhook validation failed: Missing topic header');
		error(401, 'Unauthorized');
	}

	// Validate HMAC signature
	const secret = env.SHOPIFY_API_SECRET;
	if (!secret) {
		console.error('Webhook validation failed: SHOPIFY_API_SECRET not configured');
		error(500, 'Internal Server Error');
	}

	const isValid = verifyWebhookHmac(rawBody, hmacHeader, secret);

	if (!isValid) {
		console.error(`Webhook validation failed: Invalid HMAC signature for ${topic} from ${shop}`);
		error(401, 'Unauthorized');
	}

	// Parse payload
	let payload: T;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		console.error('Webhook validation failed: Invalid JSON payload');
		error(400, 'Bad Request');
	}

	console.log(`Received ${topic} webhook for ${shop}`);

	return { shop, topic, payload, rawBody };
}

/**
 * Verify the HMAC signature of a webhook request
 * Uses timing-safe comparison to prevent timing attacks
 */
function verifyWebhookHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
	try {
		const computedHmac = crypto
			.createHmac('sha256', secret)
			.update(rawBody, 'utf8')
			.digest('base64');

		// Use timing-safe comparison
		const computedBuffer = Buffer.from(computedHmac, 'utf8');
		const headerBuffer = Buffer.from(hmacHeader, 'utf8');

		if (computedBuffer.length !== headerBuffer.length) {
			return false;
		}

		return crypto.timingSafeEqual(computedBuffer, headerBuffer);
	} catch (err) {
		console.error('HMAC verification error:', err);
		return false;
	}
}
