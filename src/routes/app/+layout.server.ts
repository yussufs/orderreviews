import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { loadPlanContext } from '$lib/server/services/billing';
import { getAccountVerification } from '$lib/server/services/verification';
import { getPrimaryPlaceId } from '$lib/server/services/locations';

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

	// Account-level ownership verification, so any merchant page can prompt the
	// merchant to verify (home / widget banners, onboarding notice).
	const verification = shop
		? await getAccountVerification(shop)
		: { required: false, verified: true, needsVerification: false };

	// Whether the merchant has connected a location yet — the app's definition of
	// "onboarded" (a shop with none is sent to the onboarding wizard). Used to hold
	// back plan/usage banners until the merchant has actually set the app up.
	const hasLocation = shop ? !!(await getPrimaryPlaceId(shop)) : false;

	return {
		apiKey: env.SHOPIFY_API_KEY,
		shop,
		plan,
		planInterval,
		usage,
		verification,
		hasLocation,
		dev
	};
};
