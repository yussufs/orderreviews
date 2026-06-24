import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const shop = locals.shopify?.session?.shop ?? null;
	// The review form is served on the merchant's own storefront via the App Proxy.
	return { shareUrl: shop ? `https://${shop}/apps/order-reviews/review` : null };
};
