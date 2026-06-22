import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { handleOrderTrigger } from '$lib/server/webhooks/order-trigger';

export const POST: RequestHandler = async ({ request }) => {
	const { shop, topic, payload } = await authenticateWebhook(request);
	try {
		await handleOrderTrigger(shop, topic, payload);
	} catch (err) {
		console.error('Error processing orders/fulfilled webhook:', err);
	}
	return new Response();
};
