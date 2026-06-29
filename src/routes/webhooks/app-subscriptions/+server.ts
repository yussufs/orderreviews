/**
 * app_subscriptions/update webhook — the primary plan-sync signal for Billing
 * API subscriptions. Fires the moment a merchant approves a charge, starts/ends
 * a trial, cancels, or a charge is frozen. We map the payload to our plan state
 * and upsert it; no Admin API call needed (the payload carries everything).
 */
import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { setPlanState } from '$lib/server/services/billing';

interface AppSubscriptionPayload {
	app_subscription?: {
		admin_graphql_api_id?: string;
		name?: string;
		status?: string;
		interval?: string; // 'every_30_days' | 'annual'
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const { shop, payload } = await authenticateWebhook(request);

	try {
		const sub = (payload as AppSubscriptionPayload).app_subscription;
		const status = sub?.status ?? null;
		const isActive = status === 'ACTIVE';
		const interval =
			sub?.interval === 'annual' ? 'annual' : sub?.interval === 'every_30_days' ? 'monthly' : null;

		await setPlanState(shop, {
			plan: isActive ? 'premium' : 'free',
			planInterval: isActive ? interval : null,
			subscriptionId: sub?.admin_graphql_api_id ?? null,
			subscriptionStatus: status
		});
		console.log(`[webhook] app_subscriptions/update for ${shop}: status=${status}`);
	} catch (err) {
		console.error('Error processing app_subscriptions/update webhook:', err);
	}

	return new Response();
};
