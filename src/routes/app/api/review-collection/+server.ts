import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import {
	getSettings,
	saveSettings,
	type ReviewCollectionSettingsInput
} from '$lib/server/services/review-collection';

const TRIGGERS = ['orders/paid', 'orders/fulfilled'];
const RATING_TYPES = ['stars', 'thumbs'];

/** GET /app/api/review-collection — current settings (defaults if unset). */
export const GET: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const settings = await getSettings(auth.session.shop);
	return json({ settings });
};

/** PUT /app/api/review-collection — save settings. Body: ReviewCollectionSettingsInput. */
export const PUT: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	let body: ReviewCollectionSettingsInput;
	try {
		body = (await request.json()) as ReviewCollectionSettingsInput;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!TRIGGERS.includes(body.trigger)) {
		return json({ error: 'Invalid trigger' }, { status: 400 });
	}
	if (!RATING_TYPES.includes(body.ratingType)) {
		return json({ error: 'Invalid ratingType' }, { status: 400 });
	}
	if (body.threshold < 1 || body.threshold > 5) {
		return json({ error: 'threshold must be 1–5' }, { status: 400 });
	}

	const settings = await saveSettings(auth.session.shop, {
		enabled: !!body.enabled,
		trigger: body.trigger,
		delayDays: Math.max(0, Number(body.delayDays) || 0),
		ratingType: body.ratingType,
		threshold: Number(body.threshold),
		placeId: body.placeId || null,
		followupEnabled: !!body.followupEnabled,
		followupDelayDays: Math.max(0, Number(body.followupDelayDays) || 0),
		maxFollowups: Math.max(0, Number(body.maxFollowups) || 0),
		notifyMerchantOnLowRating: !!body.notifyMerchantOnLowRating,
		merchantEmail: body.merchantEmail || null,
		fromName: body.fromName || null,
		subject: body.subject || null,
		// Preserved when omitted (drizzle skips undefined); set by the form editor.
		formContent: body.formContent
	});
	return json({ settings });
};
