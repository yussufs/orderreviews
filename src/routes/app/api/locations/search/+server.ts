import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { searchPlaces } from '$lib/server/services/google-places';
import { searchLocationsApify } from '$lib/server/services/apify';

/** GET /app/api/locations/search?q=... — search Google for a business. */
export const GET: RequestHandler = async ({ request, url }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const query = (url.searchParams.get('q') || '').trim();
	if (!query) return json({ results: [] });

	try {
		const results = await searchPlaces(query);
		return json({ results });
	} catch (err) {
		// Fall back to the Apify scraper on Places API error/quota.
		console.error('[locations/search] Places API failed, trying Apify:', err);
		try {
			const results = await searchLocationsApify(query);
			return json({ results });
		} catch (fallbackErr) {
			console.error('[locations/search] Apify fallback failed:', fallbackErr);
			return json({ results: [], error: 'Search failed' }, { status: 502 });
		}
	}
};
