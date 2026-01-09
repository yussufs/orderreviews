import { error } from '@sveltejs/kit';
import { shopify } from './index';

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
export async function authenticateWebhook<T = unknown>(request: Request): Promise<WebhookContext<T>> {
	const rawBody = await request.text();
	const shop = request.headers.get('x-shopify-shop-domain');
	const topic = request.headers.get('x-shopify-topic');

	// Validate required headers
	if (!shop) {
		console.error('Webhook validation failed: Missing shop domain header');
		error(401, 'Unauthorized');
	}

	if (!topic) {
		console.error('Webhook validation failed: Missing topic header');
		error(401, 'Unauthorized');
	}

	// Validate HMAC signature using Shopify API
	try {
		const valid = await shopify.api.webhooks.validate({
			rawBody,
			rawRequest: request
		});

		if (!valid) {
			console.error(`Webhook validation failed: Invalid HMAC signature for ${topic} from ${shop}`);
			error(401, 'Unauthorized');
		}
	} catch (err) {
		console.error('Webhook validation error:', err);
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
