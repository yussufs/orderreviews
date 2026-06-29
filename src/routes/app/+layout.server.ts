import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { loadPlanContext } from '$lib/server/services/billing';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const shop = locals.shopify?.session?.shop || url.searchParams.get('shop') || '';

	// Plan + monthly usage for gating UI (banner, nav, pricing page). Reconciles
	// from Shopify only when stale; the app_subscriptions/update webhook is the
	// real-time source of truth.
	const { plan, planInterval, usage } = shop
		? await loadPlanContext(shop, locals.shopify?.admin)
		: {
				plan: 'free' as const,
				planInterval: null,
				usage: { emailsSent: 0, cap: 10, overLimit: false }
			};

	return {
		apiKey: env.SHOPIFY_API_KEY,
		shop,
		plan,
		planInterval,
		usage,
		dev
	};
};
