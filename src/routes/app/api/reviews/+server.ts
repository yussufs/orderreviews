import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { getReviewsForLocation } from '$lib/server/services/locations';
import { updateReviewVisibility } from '$lib/server/services/reviews';

/** GET /app/api/reviews?placeId=... — reviews for a location (merchant mgmt). */
export const GET: RequestHandler = async ({ request, url }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const placeId = url.searchParams.get('placeId');
	if (!placeId) return json({ error: 'placeId is required' }, { status: 400 });

	const reviews = await getReviewsForLocation(auth.session.shop, placeId);
	return json({ reviews });
};

/** PATCH /app/api/reviews — toggle a review's visibility. Body: { reviewId, hidden }. */
export const PATCH: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	let body: { reviewId?: string; hidden?: boolean };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	if (!body.reviewId || typeof body.hidden !== 'boolean') {
		return json({ error: 'reviewId and hidden are required' }, { status: 400 });
	}

	const review = await updateReviewVisibility(auth.session.shop, body.reviewId, body.hidden);
	if (!review) return json({ error: 'Not found' }, { status: 404 });
	return json({ review });
};
