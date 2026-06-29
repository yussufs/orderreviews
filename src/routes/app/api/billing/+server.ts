import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { db } from '$lib/server/db';
import { shopPreferences } from '$lib/shared/db';
import { eq } from 'drizzle-orm';
import { resolveAppBaseUrl } from '$lib/server/shopify';
import { createSubscription, cancelSubscription } from '$lib/server/services/billing';

/**
 * POST /app/api/billing — start a premium subscription. Body: { interval }.
 * Returns { confirmationUrl } that the client must open in the TOP frame for the
 * merchant to approve the charge.
 */
export const POST: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	let body: { interval?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	const interval = body.interval === 'monthly' ? 'monthly' : 'annual';

	const base = resolveAppBaseUrl();
	if (!base) return json({ error: 'App URL is not configured' }, { status: 500 });
	// Shopify redirects the browser here (top frame) after approval; the return
	// page re-syncs the subscription and bounces back into the embedded app.
	const returnUrl = `${base}/billing/return?shop=${encodeURIComponent(auth.session.shop)}`;

	const { confirmationUrl, error } = await createSubscription({
		admin: auth.admin,
		interval,
		returnUrl,
		test: dev
	});
	if (error || !confirmationUrl) {
		return json({ error: error || 'Could not start checkout' }, { status: 502 });
	}
	return json({ confirmationUrl });
};

/** DELETE /app/api/billing — cancel the active subscription (back to free). */
export const DELETE: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const prefs = await db.query.shopPreferences.findFirst({
		where: eq(shopPreferences.shop, auth.session.shop)
	});
	if (!prefs?.subscriptionId) {
		return json({ error: 'No active subscription to cancel' }, { status: 400 });
	}

	const { error } = await cancelSubscription(auth.session.shop, auth.admin, prefs.subscriptionId);
	if (error) return json({ error }, { status: 502 });
	return json({ ok: true });
};
