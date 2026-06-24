/**
 * Public review form on the merchant's storefront domain, via the App Proxy:
 *   GET  https://{store}/apps/order-reviews/review        -> renders the form
 *   POST https://{store}/apps/order-reviews/review (JSON) -> stores private feedback
 *
 * Shopify identifies the shop via signed proxy params (no token needed). The
 * POST is JSON (not a form body), so SvelteKit's form-CSRF check doesn't apply.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyProxySignature, getShopFromProxy } from '$lib/server/shopify/proxy';
import {
	getSettings,
	recordFeedback,
	markFeedbackEmailed
} from '$lib/server/services/review-collection';
import { getPrimaryPlaceId } from '$lib/server/services/locations';
import { sendEmail } from '$lib/server/email/ses';
import { merchantNotifyEmail } from '$lib/server/email/templates';
import { renderReviewForm } from '$lib/shared/review-form-html';

function storeName(shop: string): string {
	const handle = shop.replace(/\.myshopify\.com$/, '');
	return handle
		.split(/[-_]/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function resolveShop(url: URL): string {
	// This endpoint stores feedback and triggers merchant emails, so the App Proxy
	// signature is REQUIRED (no fail-open, no unsigned `myshopify_domain` fallback).
	// Only trust the `shop` that arrived inside the signed parameter set.
	if (!verifyProxySignature(url.searchParams)) error(401, 'Invalid signature');
	const shop = getShopFromProxy(url.searchParams);
	if (!shop) error(400, 'Shop parameter is required');
	return shop;
}

export const GET: RequestHandler = async ({ url }) => {
	const shop = resolveShop(url);
	const settings = await getSettings(shop);
	const placeId = settings.placeId || (await getPrimaryPlaceId(shop));

	const html = renderReviewForm({
		storeName: storeName(shop),
		ratingType: settings.ratingType,
		threshold: settings.threshold,
		writeReviewUrl: placeId
			? `https://search.google.com/local/writereview?placeid=${placeId}`
			: null,
		content: settings.formContent
	});

	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
	});
};

export const POST: RequestHandler = async ({ request, url }) => {
	const shop = resolveShop(url);

	let body: { rating?: unknown; message?: unknown; email?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const rating = Number(body.rating);
	if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
		return json({ error: 'Please choose a rating.' }, { status: 400 });
	}
	const message = String(body.message ?? '').trim();
	const customerEmail = String(body.email ?? '').trim() || null;

	const settings = await getSettings(shop);
	const feedback = await recordFeedback({ shop, source: 'link', rating, message, customerEmail });

	if (settings.notifyMerchantOnLowRating && settings.merchantEmail) {
		const { subject, html } = merchantNotifyEmail({
			storeName: storeName(shop),
			rating,
			message,
			customerEmail
		});
		const res = await sendEmail({
			to: settings.merchantEmail,
			subject,
			html,
			replyTo: customerEmail || undefined
		});
		if (res.success) await markFeedbackEmailed(feedback.id);
	}

	return json({ success: true });
};
