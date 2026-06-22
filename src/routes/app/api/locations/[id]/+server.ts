import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { deleteLocation, updateLocationFilters } from '$lib/server/services/locations';
import type { ReviewFilters } from '$lib/shared/db';

/** DELETE /app/api/locations/:id — remove a location (id = placeId). */
export const DELETE: RequestHandler = async ({ request, params }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const ok = await deleteLocation(auth.session.shop, params.id);
	if (!ok) return json({ error: 'Not found' }, { status: 404 });
	return json({ success: true });
};

/** PATCH /app/api/locations/:id — update stored review filters. Body: ReviewFilters. */
export const PATCH: RequestHandler = async ({ request, params }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	let filters: ReviewFilters;
	try {
		filters = (await request.json()) as ReviewFilters;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const location = await updateLocationFilters(auth.session.shop, params.id, filters);
	if (!location) return json({ error: 'Not found' }, { status: 404 });
	return json({ location });
};
