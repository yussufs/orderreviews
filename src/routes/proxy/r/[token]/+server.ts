/**
 * Per-order review landing, served on the merchant's storefront via the App
 * Proxy (https://{store}/apps/order-reviews/r/{token}). This is where the
 * one-click rating links in the post-order emails point.
 *
 * Auth is the signed feedback token in the path (encodes the review request +
 * chosen rating), so we don't depend on the proxy signature here.
 *   GET  -> records the response, cancels follow-ups, renders the pre-rated form
 *   POST -> stores the private feedback message (JSON; no form-CSRF)
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyFeedbackToken } from '$lib/server/tokens';
import {
	getReviewRequest,
	getSettings,
	markResponded,
	recordFeedback,
	markFeedbackEmailed
} from '$lib/server/services/review-collection';
import { getPrimaryPlaceId } from '$lib/server/services/locations';
import { cancelFollowups } from '$lib/server/queue/enqueue';
import { sendEmail } from '$lib/server/email/ses';
import { merchantNotifyEmail } from '$lib/server/email/templates';
import { renderReviewForm } from '$lib/shared/review-form-html';

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}
function storeName(shop: string): string {
	const handle = shop.replace(/\.myshopify\.com$/, '');
	return handle
		.split(/[-_]/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

export const GET: RequestHandler = async ({ params }) => {
	const payload = verifyFeedbackToken(params.token, nowSeconds());
	if (!payload) error(410, 'This link has expired or is no longer valid.');

	const req = await getReviewRequest(payload.rid);
	if (!req) error(410, 'This link is no longer valid.');

	const settings = await getSettings(req.shop);

	// First response wins; cancel any scheduled follow-ups.
	const responded = await markResponded(req.id, payload.r);
	if (responded) await cancelFollowups(responded.followupJobIds);

	const placeId = settings.placeId || (await getPrimaryPlaceId(req.shop));
	const html = renderReviewForm({
		storeName: storeName(req.shop),
		ratingType: settings.ratingType,
		threshold: settings.threshold,
		writeReviewUrl: placeId
			? `https://search.google.com/local/writereview?placeid=${placeId}`
			: null,
		content: settings.formContent,
		preRating: payload.r
	});

	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
	});
};

export const POST: RequestHandler = async ({ request, params }) => {
	const payload = verifyFeedbackToken(params.token, nowSeconds());
	if (!payload) return json({ error: 'This link is no longer valid.' }, { status: 410 });

	const req = await getReviewRequest(payload.rid);
	if (!req) return json({ error: 'This link is no longer valid.' }, { status: 410 });

	let body: { rating?: unknown; message?: unknown; email?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const rating = Number(body.rating ?? payload.r);
	const message = String(body.message ?? '').trim();
	const customerEmail = String(body.email ?? '').trim() || req.customerEmail || null;

	const settings = await getSettings(req.shop);
	const feedback = await recordFeedback({
		shop: req.shop,
		reviewRequestId: req.id,
		source: 'order',
		rating,
		message,
		customerEmail
	});

	if (settings.notifyMerchantOnLowRating && settings.merchantEmail) {
		const { subject, html } = merchantNotifyEmail({
			storeName: storeName(req.shop),
			rating,
			message,
			customerEmail,
			orderId: req.orderId
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
