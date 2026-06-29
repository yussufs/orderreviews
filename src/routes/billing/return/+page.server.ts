/**
 * Billing return page. Shopify redirects the merchant's browser here (TOP frame,
 * NOT embedded) after they approve/decline a subscription. We reconcile the
 * subscription via the offline session (no id_token here) and then the page
 * bounces back into the embedded app.
 */
import type { PageServerLoad } from './$types';
import { getOfflineSession } from '$lib/server/shopify/auth';
import { createAdmin } from '$lib/server/shopify/graphql';
import { syncSubscription } from '$lib/server/services/billing';
import { appAdminUrl } from '$lib/shared/billing/app-urls';

export const load: PageServerLoad = async ({ url }) => {
	const shop = url.searchParams.get('shop') || '';

	if (shop) {
		try {
			const session = await getOfflineSession(shop);
			await syncSubscription(shop, createAdmin(session));
		} catch (err) {
			console.error('[billing/return] sync failed:', err);
		}
	}

	return { appUrl: shop ? appAdminUrl(shop) : '/' };
};
