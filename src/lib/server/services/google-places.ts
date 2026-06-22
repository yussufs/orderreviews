/**
 * Google Places API (New) service — business search + place details.
 * SvelteKit-side (uses `$env`); called from merchant API routes.
 */
import { env } from '$env/dynamic/private';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

export interface PlaceSearchResult {
	placeId: string;
	title: string;
	address: string;
	phone?: string;
	website?: string;
	totalScore?: number;
	reviewsCount?: number;
	imageUrl?: string;
}

interface GooglePlace {
	id: string;
	displayName?: { text: string };
	formattedAddress?: string;
	nationalPhoneNumber?: string;
	websiteUri?: string;
	rating?: number;
	userRatingCount?: number;
	photos?: Array<{ name: string }>;
}

interface TextSearchResponse {
	places?: GooglePlace[];
}

function apiKey(): string {
	const key = env.GOOGLE_PLACES_API_KEY;
	if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not configured');
	return key;
}

function photoUrl(place: GooglePlace, key: string): string | undefined {
	return place.photos?.[0]?.name
		? `${PLACES_API_BASE}/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${key}`
		: undefined;
}

function toResult(place: GooglePlace, key: string): PlaceSearchResult {
	return {
		placeId: place.id,
		title: place.displayName?.text || 'Unknown',
		address: place.formattedAddress || '',
		phone: place.nationalPhoneNumber,
		website: place.websiteUri,
		totalScore: place.rating,
		reviewsCount: place.userRatingCount,
		imageUrl: photoUrl(place, key)
	};
}

/** Search for places by free-text query (e.g. a business name + city). */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
	const key = apiKey();

	const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': key,
			'X-Goog-FieldMask':
				'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.photos'
		},
		body: JSON.stringify({ textQuery: query, maxResultCount: 10 })
	});

	if (!response.ok) {
		throw new Error(`Google Places API error: ${await response.text()}`);
	}

	const data: TextSearchResponse = await response.json();
	if (!data.places?.length) return [];
	return data.places.map((p) => toResult(p, key));
}

/** Fetch details for a single place id. Returns null on 404. */
export async function getPlaceDetails(placeId: string): Promise<PlaceSearchResult | null> {
	const key = apiKey();

	const response = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
		method: 'GET',
		headers: {
			'X-Goog-Api-Key': key,
			'X-Goog-FieldMask':
				'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,photos'
		}
	});

	if (!response.ok) {
		if (response.status === 404) return null;
		throw new Error(`Google Places API error: ${await response.text()}`);
	}

	const place: GooglePlace = await response.json();
	return toResult(place, key);
}
