/**
 * API functions for fetching widget data
 */

import type {
	WidgetSettingsResponse,
	Review,
	GLocation,
	DisplaySettings,
	WidgetConfig,
	ImportStatus
} from './types';
import { DummyReviews, DummyLocations } from './data';
import { getTimeAgo, resizeGoogleImage } from './utils';

// Avatar renders at ~40px (merchant-overridable); 128 covers up to 64px @2x.
const AVATAR_SIZE = 128;

const DEFAULT_ENDPOINT = '/apps/order-reviews/widget-settings';
const POLLING_INTERVAL = 2000;
// Bumped to v2 with the ownership-verification gate: the instant cache fast-path
// renders before the server confirms `verified`, so any pre-gate cached reviews
// (written by the old widget) could briefly flash on the live storefront of a
// now-unverified shop. Versioning the prefix orphans those stale entries. v2 caches
// are only ever written for verified shops (see the guard in fetchFreshData).
const CACHE_PREFIX = 'order_reviews_v2_';

/**
 * Cache data structure
 */
interface CachedWidgetData {
	reviewData: Review[];
	placeData: GLocation;
	displaySettings: DisplaySettings;
	customCss: string;
	timestamp: number;
}

/**
 * Get cache key for a specific shop/location
 */
function getCacheKey(myshopifyDomain: string, location: number): string {
	return `${CACHE_PREFIX}${myshopifyDomain}_${location}`;
}

/**
 * Get cached widget data from sessionStorage
 */
export function getCachedData(myshopifyDomain: string, location: number): CachedWidgetData | null {
	try {
		const key = getCacheKey(myshopifyDomain, location);
		const cached = sessionStorage.getItem(key);
		if (cached) {
			return JSON.parse(cached);
		}
	} catch {
		// sessionStorage not available or parse error
	}
	return null;
}

/**
 * Save widget data to sessionStorage cache
 */
function setCachedData(
	myshopifyDomain: string,
	location: number,
	data: Omit<CachedWidgetData, 'timestamp'>
): void {
	try {
		const key = getCacheKey(myshopifyDomain, location);
		const cacheData: CachedWidgetData = {
			...data,
			timestamp: Date.now()
		};
		sessionStorage.setItem(key, JSON.stringify(cacheData));
	} catch {
		// sessionStorage not available or quota exceeded
	}
}

/**
 * Enrich reviews with computed fields (e.g., timeago)
 * Also maps API field names to internal field names
 */
export function enrichReviews(reviews: Array<Review | ApiReview>): Review[] {
	return reviews.map((review) => {
		// Input may be the internal Review shape or the API response shape.
		const r = review as Partial<Review> & Partial<ApiReview>;
		const date = r.publishedAtDate || r.date || '';
		return {
			reviewId: r.reviewId || r.id || '',
			text: r.text,
			name: r.name as string,
			stars: r.stars as number,
			publishedAtDate: date,
			reviewerPhotoUrl: resizeGoogleImage(r.reviewerPhotoUrl || r.reviewerPhoto || '', {
				size: AVATAR_SIZE
			}),
			reviewImageUrls: r.reviewImageUrls || r.images || [],
			timeago: date ? getTimeAgo(date) : ''
		};
	});
}

// API response review structure (different field names)
interface ApiReview {
	id?: string;
	text?: string;
	name: string;
	stars: number;
	date?: string;
	reviewerPhoto?: string;
	images?: string[];
}

/**
 * Fetch widget settings from the App Proxy endpoint
 */
export async function fetchWidgetSettings(config: {
	endpoint?: string;
	location?: number;
	myshopifyDomain?: string;
	widgetType?: string;
	designMode?: boolean;
}): Promise<WidgetSettingsResponse> {
	const endpoint = config.endpoint || DEFAULT_ENDPOINT;

	const params = new URLSearchParams({
		location: String(config.location || 1),
		myshopify_domain: config.myshopifyDomain || '',
		widget_type: config.widgetType || ''
	});
	// In the theme editor we ask the server for the real widget data even when the
	// shop is unverified, so the merchant can preview and tune it. The live
	// storefront never sends this, so unverified reviews stay hidden there.
	if (config.designMode) params.set('design_mode', 'true');

	const urlWithParams = `${endpoint}?${params.toString()}`;

	const response = await fetch(urlWithParams, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Error fetching reviews: ${response.statusText}`);
	}

	return response.json();
}

/**
 * Poll for widget data until reviews are loaded
 * Returns a cleanup function to stop polling
 * Uses sessionStorage cache for instant display on re-renders
 */
export function pollForWidgetData(
	config: {
		endpoint?: string;
		location?: number;
		myshopifyDomain?: string;
		widgetType?: string;
		designMode?: boolean;
	},
	onData: (data: {
		loading: boolean;
		importing: boolean;
		importProgress: number;
		importStatus?: ImportStatus;
		reviewData: Review[];
		placeData: GLocation;
		displaySettings: DisplaySettings;
		customCss: string;
		/** false when the shop hasn't verified business ownership (reviews withheld). */
		verified?: boolean;
	}) => void,
	onError: (error: Error) => void
): () => void {
	let isPolling = true;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	const location = config.location || 1;
	const myshopifyDomain = config.myshopifyDomain || '';

	// Check for cached data first - instant display
	const cached = getCachedData(myshopifyDomain, location);
	if (cached && cached.reviewData.length > 0) {
		onData({
			loading: false,
			importing: false,
			importProgress: 0,
			reviewData: cached.reviewData,
			placeData: cached.placeData,
			displaySettings: cached.displaySettings,
			customCss: cached.customCss
		});
		// Still fetch fresh data in background but don't show loading state
		fetchFreshData();
		return () => {
			isPolling = false;
			if (timeoutId) clearTimeout(timeoutId);
		};
	}

	async function fetchFreshData() {
		if (!isPolling) return;

		try {
			const data = await fetchWidgetSettings(config);

			// Ownership gate. `verified === false` means the shop hasn't verified
			// business ownership. On the live storefront the server already withheld
			// all data; in the theme editor it sends the real data so the merchant can
			// preview it, and the router shows a "needs verification" notice above.
			// The flag is threaded through every onData below so the router can react.
			const verified = data.verified;

			// Check if reviews are being imported (no reviews yet, task in progress)
			if (data.importing) {
				const placeData = Array.isArray(data.placeData) ? data.placeData[0] : data.placeData;
				onData({
					loading: false,
					importing: true,
					importProgress: data.importProgress || 0,
					importStatus: data.importStatus,
					reviewData: [],
					placeData: placeData || DummyLocations[0],
					displaySettings: data.displaySettings || {},
					customCss: data.customCss || '',
					verified
				});

				// Keep polling until import is complete
				if (isPolling) {
					timeoutId = setTimeout(fetchFreshData, POLLING_INTERVAL);
				}
				return;
			}

			if (data.reviewsLoading) {
				// Only show loading if we don't have cached data
				if (!cached) {
					onData({
						loading: true,
						importing: false,
						importProgress: 0,
						reviewData: [],
						placeData: DummyLocations[0],
						displaySettings: {},
						customCss: '',
						verified
					});
				}

				if (isPolling) {
					timeoutId = setTimeout(fetchFreshData, POLLING_INTERVAL);
				}
				return;
			}

			// Data is ready
			const reviewData = enrichReviews(data.reviewData);
			const placeData = Array.isArray(data.placeData) ? data.placeData[0] : data.placeData;

			// Cache the data — but never for an unverified shop. Its reviews are only
			// fetched in the theme editor (design mode); caching them could flash them
			// onto the live storefront in the same browser session via the cache path.
			if (verified !== false) {
				setCachedData(myshopifyDomain, location, {
					reviewData,
					placeData,
					displaySettings: data.displaySettings,
					customCss: data.customCss
				});
			}

			onData({
				loading: false,
				importing: false,
				importProgress: 0,
				reviewData,
				placeData,
				displaySettings: data.displaySettings,
				customCss: data.customCss,
				verified
			});
		} catch (error) {
			onError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	// Start fetching
	fetchFreshData();

	// Return cleanup function
	return () => {
		isPolling = false;
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	};
}

/**
 * Get dummy data for preview/development mode
 */
export function getDummyData(): {
	reviewData: Review[];
	placeData: GLocation;
} {
	return {
		reviewData: enrichReviews(DummyReviews),
		placeData: DummyLocations[0]
	};
}

/**
 * Extract widget configuration from an HTML element's attributes
 */
export function extractWidgetConfig(element: HTMLElement): WidgetConfig {
	return {
		widgetType: element.getAttribute('widget-type') || 'grid',
		variant: element.getAttribute('variant') || '',
		myshopifyDomain: element.getAttribute('myshopify-domain') || '',
		endpoint: element.getAttribute('endpoint') || DEFAULT_ENDPOINT,
		location: parseInt(element.getAttribute('location') || '1', 10),
		displaySettings: {},
		customCss: ''
	};
}
