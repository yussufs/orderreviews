/**
 * Public review-collection landing page (no auth, token-verified, no cookies).
 *
 * Load: verify the signed token, record the customer's first response, cancel
 * pending follow-ups, and branch — high ratings go to Google, low ratings get a
 * private feedback form. The effect is idempotent so re-clicks are harmless.
 */
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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

export const load: PageServerLoad = async ({ params }) => {
	const payload = verifyFeedbackToken(params.token, nowSeconds());
	if (!payload) error(410, 'This link has expired or is no longer valid.');

	const req = await getReviewRequest(payload.rid);
	if (!req) error(410, 'This link is no longer valid.');

	const settings = await getSettings(req.shop);

	// First response wins; cancel any scheduled follow-ups.
	const responded = await markResponded(req.id, payload.r);
	if (responded) await cancelFollowups(responded.followupJobIds);

	const positive = payload.r >= settings.threshold;
	let writeReviewUrl: string | null = null;
	if (positive) {
		const placeId = settings.placeId || (await getPrimaryPlaceId(req.shop));
		writeReviewUrl = placeId
			? `https://search.google.com/local/writereview?placeid=${placeId}`
			: null;
	}

	return {
		branch: positive ? ('positive' as const) : ('private' as const),
		rating: payload.r,
		storeName: storeName(req.shop),
		writeReviewUrl
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const payload = verifyFeedbackToken(params.token, nowSeconds());
		if (!payload) return fail(410, { error: 'This link has expired.' });

		const req = await getReviewRequest(payload.rid);
		if (!req) return fail(410, { error: 'This link is no longer valid.' });

		const form = await request.formData();
		const message = String(form.get('message') || '').trim();

		const settings = await getSettings(req.shop);
		const feedback = await recordFeedback({
			shop: req.shop,
			reviewRequestId: req.id,
			rating: payload.r,
			message,
			customerEmail: req.customerEmail
		});

		// Notify the merchant if configured + an address is available.
		if (settings.notifyMerchantOnLowRating && settings.merchantEmail) {
			const { subject, html } = merchantNotifyEmail({
				storeName: storeName(req.shop),
				rating: payload.r,
				message,
				customerEmail: req.customerEmail,
				orderId: req.orderId
			});
			const res = await sendEmail({
				to: settings.merchantEmail,
				subject,
				html,
				replyTo: req.customerEmail
			});
			if (res.success) await markFeedbackEmailed(feedback.id);
		}

		return { success: true };
	}
};
