import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { getPlaceDetails } from '$lib/server/services/google-places';
import {
	getLocationsForShop,
	upsertLocation,
	getLocation,
	getLocationOwner
} from '$lib/server/services/locations';
import { startReviewFetch } from '$lib/server/services/jobs';

/** GET /app/api/locations — list the shop's imported locations. */
export const GET: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const locations = await getLocationsForShop(auth.session.shop);
	return json({ locations });
};

/**
 * POST /app/api/locations — import a location by placeId, then kick off a
 * review-fetch job. Body: { placeId }.
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

	// A place can belong to only one shop (placeId is the global PK).
	const existing = await getLocation(shop, placeId);
	if (!existing) {
		const owner = await getLocationOwner(placeId);
		if (owner && owner !== shop) {
			return json(
				{ error: 'This location is already connected to another store' },
				{ status: 409 }
			);
		}
	}

	const details = await getPlaceDetails(placeId);
	if (!details) return json({ error: 'Place not found' }, { status: 404 });

	const location = await upsertLocation(shop, details);
	const jobId = await startReviewFetch(shop, location.placeId);

	return json({ location, jobId });
};
