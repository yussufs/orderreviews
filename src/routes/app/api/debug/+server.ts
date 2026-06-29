/**
 * Dev-only debug API. Lets you toggle plan, set monthly usage, and fire test
 * emails without going through Shopify billing or real orders. Hard-gated on
 * `dev` — returns 403 in any production build.
 */
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { db } from '$lib/server/db';
import { shopPreferences, shopUsage } from '$lib/shared/db';
import { eq, and } from 'drizzle-orm';
import { resolveAppBaseUrl } from '$lib/server/shopify';
import { setPlanState } from '$lib/server/services/billing';
import { getSettings, createReviewRequest } from '$lib/server/services/review-collection';
import { buildRatingLinks, prettyStoreName } from '$lib/server/queue/handlers/shared';
import { feedbackRequestEmail, overLimitEmail } from '$lib/server/email/templates';
import { sendEmail } from '$lib/server/email/ses';
import { currentPeriod } from '$lib/shared/billing/usage';
import { FREE_EMAIL_CAP } from '$lib/shared/billing/limits';
import { appAdminUrl } from '$lib/shared/billing/app-urls';

async function loadState(shop: string) {
	const prefs = await db.query.shopPreferences.findFirst({
		where: eq(shopPreferences.shop, shop)
	});
	const period = currentPeriod();
	const usage = await db.query.shopUsage.findFirst({
		where: and(eq(shopUsage.shop, shop), eq(shopUsage.period, period))
	});
	const settings = await getSettings(shop);
	const emailsSent = usage?.emailsSent ?? 0;
	return {
		plan: prefs?.plan ?? 'free',
		planInterval: prefs?.planInterval ?? null,
		subscriptionStatus: prefs?.subscriptionStatus ?? null,
		subscriptionId: prefs?.subscriptionId ?? null,
		period,
		emailsSent,
		cap: FREE_EMAIL_CAP,
		overLimit: emailsSent >= FREE_EMAIL_CAP,
		overLimitNotifiedAt: usage?.overLimitNotifiedAt ?? null,
		defaultEmail: settings.merchantEmail || prefs?.email || ''
	};
}

/** GET /app/api/debug — current plan + usage state. */
export const GET: RequestHandler = async ({ request }) => {
	if (!dev) return json({ error: 'Not available' }, { status: 403 });
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;
	return json({ state: await loadState(auth.session.shop) });
};

/** POST /app/api/debug — perform a debug action. Body: { action, ... }. */
export const POST: RequestHandler = async ({ request }) => {
	if (!dev) return json({ error: 'Not available' }, { status: 403 });
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;
	const shop = auth.session.shop;

	let body: { action?: string; plan?: string; emailsSent?: number; email?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	switch (body.action) {
		case 'setPlan': {
			const premium = body.plan === 'premium';
			await setPlanState(shop, {
				plan: premium ? 'premium' : 'free',
				planInterval: premium ? 'annual' : null,
				subscriptionId: premium ? 'gid://shopify/AppSubscription/debug' : null,
				subscriptionStatus: premium ? 'ACTIVE' : 'CANCELLED'
			});
			break;
		}
		case 'setUsage': {
			const emailsSent = Math.max(0, Math.floor(Number(body.emailsSent) || 0));
			const now = new Date();
			await db
				.insert(shopUsage)
				.values({ shop, period: currentPeriod(), emailsSent })
				.onConflictDoUpdate({
					target: [shopUsage.shop, shopUsage.period],
					// Clearing the notify flag lets the over-limit email fire again on the next test.
					set: { emailsSent, overLimitNotifiedAt: null, updatedAt: now }
				});
			break;
		}
		case 'sendFeedbackEmail': {
			const email = (body.email || '').trim();
			if (!email) return json({ error: 'email is required' }, { status: 400 });
			const settings = await getSettings(shop);
			const { row } = await createReviewRequest({
				shop,
				orderId: `debug-${Date.now()}`,
				customerEmail: email,
				customerName: 'Debug Tester',
				scheduledFor: new Date(),
				appBaseUrl: resolveAppBaseUrl()
			});
			const storeName = prettyStoreName(shop, settings.storeName || settings.fromName);
			const ratingLinks = buildRatingLinks(row.id, settings.ratingType, shop);
			const { subject, html } = feedbackRequestEmail({
				storeName,
				customerName: 'Debug Tester',
				ratingType: settings.ratingType,
				ratingLinks
			});
			const result = await sendEmail({
				to: email,
				subject: settings.subject || subject,
				html,
				fromName: settings.fromName || undefined
			});
			return json({ ok: result.success, dryRun: result.dryRun, error: result.error });
		}
		case 'sendOverLimitEmail': {
			const email = (body.email || '').trim();
			if (!email) return json({ error: 'email is required' }, { status: 400 });
			const settings = await getSettings(shop);
			const storeName = prettyStoreName(shop, settings.storeName || settings.fromName);
			const { subject, html } = overLimitEmail({
				storeName,
				cap: FREE_EMAIL_CAP,
				upgradeUrl: appAdminUrl(shop)
			});
			const result = await sendEmail({ to: email, subject, html });
			return json({ ok: result.success, dryRun: result.dryRun, error: result.error });
		}
		default:
			return json({ error: `Unknown action: ${body.action}` }, { status: 400 });
	}

	return json({ ok: true, state: await loadState(shop) });
};
