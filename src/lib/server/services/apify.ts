/**
 * Apify service — Google Maps place search fallback (when Places API quota is
 * hit) and place-data refresh. SvelteKit-side (uses `$env`).
 *
 * NOTE: Review IMPORT is NOT here — it lives in the worker handler
 * (`queue/handlers/reviewFetch.ts`), which reads the reviews actor's NESTED
 * output (`place.reviews[]`) and runs framework-agnostically.
 */
import { ApifyClient } from 'apify-client';
import { env } from '$env/dynamic/private';

export interface ApifyLocationData {
	placeId: string;
	title: string;
	address?: string;
	phone?: string;
	website?: string;
	totalScore?: number;
	reviewsCount?: number;
	imageUrl?: string;
}

function getClient(): ApifyClient {
	if (!env.APIFY_API_TOKEN) throw new Error('APIFY_API_TOKEN is not configured');
	return new ApifyClient({ token: env.APIFY_API_TOKEN });
}

function searchActorId(): string {
	const id = env.APIFY_GOOGLE_PLACE_SEARCH_ACTOR_ID;
	if (!id) throw new Error('APIFY_GOOGLE_PLACE_SEARCH_ACTOR_ID is not configured');
	return id;
}

function toLocation(item: Record<string, unknown>): ApifyLocationData {
	return {
		placeId: item.placeId as string,
		title: item.title as string,
		address: item.address as string | undefined,
		phone: item.phone as string | undefined,
		website: item.website as string | undefined,
		totalScore: item.totalScore as number | undefined,
		reviewsCount: item.reviewsCount as number | undefined,
		imageUrl: item.imageUrl as string | undefined
	};
}

/** Search for locations via the Apify Google Maps scraper (Places API fallback). */
export async function searchLocationsApify(query: string): Promise<ApifyLocationData[]> {
	const client = getClient();

	const run = await client.actor(searchActorId()).call({
		maxCrawledPlacesPerSearch: 10,
		searchStringsArray: [query],
		skipClosedPlaces: true,
		language: 'en',
		placeMinimumStars: '',
		website: 'allPlaces',
		searchMatching: 'all'
	});

	const { items } = await client.dataset(run.defaultDatasetId).listItems();

	if (items.length === 1 && (items[0] as Record<string, unknown>).error === 'no_search_results') {
		return [];
	}

	return items.map((item) => toLocation(item as Record<string, unknown>));
}

/** Refresh a single location's data by place id (e.g. expired imageUrl). */
export async function getLocationDataApify(placeId: string): Promise<ApifyLocationData | null> {
	const client = getClient();

	const run = await client.actor(searchActorId()).call({
		maxCrawledPlacesPerSearch: 1,
		searchStringsArray: [`place_id:${placeId}`],
		skipClosedPlaces: false,
		language: 'en',
		website: 'allPlaces',
		searchMatching: 'only_exact'
	});

	const { items } = await client.dataset(run.defaultDatasetId).listItems();
	if (items.length === 0) return null;
	return toLocation(items[0] as Record<string, unknown>);
}
