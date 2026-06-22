import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { getLocation, touchManualRefresh } from '$lib/server/services/locations';
import { startReviewFetch } from '$lib/server/services/jobs';

/** Minimum time between manual refreshes per location. */
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /app/api/reviews/refresh — manually re-import reviews for a location.
 * Body: { placeId }. Does an incremental fetch from the last fetch time.
 */
export const POST: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;
	const shop = auth.session.shop;

	let placeId: string | undefined;
	try {
		({ placeId } = await request.json());
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	if (!placeId) return json({ error: 'placeId is required' }, { status: 400 });

	const location = await getLocation(shop, placeId);
	if (!location) return json({ error: 'Not found' }, { status: 404 });

	// Rate limit manual refreshes per location.
	if (location.lastManualRefreshAt) {
		const elapsed = Date.now() - location.lastManualRefreshAt.getTime();
		if (elapsed < COOLDOWN_MS) {
			const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
			return json(
				{ error: 'Please wait before refreshing again', retryAfter },
				{ status: 429, headers: { 'Retry-After': String(retryAfter) } }
			);
		}
	}

	await touchManualRefresh(shop, placeId);
	const lastFetchDate = location.lastReviewFetchAt?.toISOString();
	const jobId = await startReviewFetch(shop, placeId, lastFetchDate);
	return json({ jobId });
};
