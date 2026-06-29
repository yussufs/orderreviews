/**
 * Widget data endpoint (Shopify App Proxy).
 *
 * Storefront requests hit https://{shop}/apps/order-reviews/widget-settings and
 * are proxied here (app_proxy url = /proxy, subpath = order-reviews). Returns
 * the location, its reviews, and display settings as JSON for the widget bundle.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyProxySignature, getShopFromProxy } from '$lib/server/shopify/proxy';
import { db } from '$lib/server/db';
import { locations, jobStatus } from '$lib/shared/db';
import { eq, and, or, gte } from 'drizzle-orm';
import { getReviewsForWidget } from '$lib/server/services/reviews';
import { getWidgetSettings } from '$lib/server/services/widget-settings';
import { getShopPlan } from '$lib/shared/billing/usage';

function placeData(location: typeof locations.$inferSelect | null) {
	if (!location) return null;
	return {
		placeId: location.placeId,
		title: location.title,
		address: location.address,
		totalScore: location.totalScore,
		reviewsCount: location.reviewsCount,
		imageUrl: location.imageUrl,
		google_page_url: `https://www.google.com/maps/place/?q=place_id:${location.placeId}`,
		// "Leave a Review" opens our hosted rating form (stars/thumbs → Google or
		// private feedback) on the storefront via the App Proxy, not Google directly.
		review_link: `/apps/order-reviews/review`
	};
}

export const GET: RequestHandler = async ({ url }) => {
	// Verify the App Proxy signature (skipped in dev where Shopify omits it).
	if (url.searchParams.has('signature') && !verifyProxySignature(url.searchParams)) {
		error(401, 'Invalid signature');
	}

	const shop = getShopFromProxy(url.searchParams) || url.searchParams.get('myshopify_domain');
	if (!shop) error(400, 'Shop parameter is required');

	const widgetType = url.searchParams.get('widget_type') || 'order_reviews_grid';
	const explicitPlaceId = url.searchParams.get('placeId');
	const locationIndex = parseInt(url.searchParams.get('location') || '1', 10);

	// Resolve target location: explicit placeId, else the Nth imported location.
	let targetPlaceId = explicitPlaceId;
	if (!targetPlaceId) {
		const shopLocations = await db.query.locations.findMany({
			where: eq(locations.shop, shop),
			orderBy: (l, { asc }) => [asc(l.createdAt)],
			limit: Math.max(locationIndex, 1)
		});
		targetPlaceId = (shopLocations[locationIndex - 1] || shopLocations[0])?.placeId ?? null;
	}

	if (!targetPlaceId) {
		return json({
			success: false,
			error: 'No locations configured',
			reviewsLoading: false,
			importing: false,
			reviewData: [],
			placeData: null
		});
	}

	const location = await db.query.locations.findFirst({
		where: eq(locations.placeId, targetPlaceId)
	});

	const settings = await getWidgetSettings(shop);
	// Free shops display at most FREE_DISPLAY_CAP reviews in the widget.
	const plan = await getShopPlan(db, shop);
	const { reviews } = await getReviewsForWidget(targetPlaceId, widgetType, plan);

	const reviewData = reviews.map((review) => ({
		id: review.reviewId,
		text: review.text,
		name: review.name,
		stars: review.stars,
		date: review.publishedAtDate?.toISOString(),
		reviewerPhoto: review.reviewerPhotoUrl,
		images: review.reviewImageUrls
	}));

	// Show the "importing" splash ONLY on a first import (no reviews yet) and when
	// the job is RECENT. A background refresh of an already-populated widget must
	// not blank it, and a stale/orphaned job must never block the widget forever.
	if (reviewData.length === 0) {
		const recentSince = new Date(Date.now() - 15 * 60 * 1000);
		const pending = await db.query.jobStatus.findFirst({
			where: and(
				eq(jobStatus.entityId, targetPlaceId),
				eq(jobStatus.type, 'fetch_reviews'),
				or(eq(jobStatus.status, 'pending'), eq(jobStatus.status, 'processing')),
				gte(jobStatus.updatedAt, recentSince)
			),
			orderBy: (j, { desc }) => [desc(j.createdAt)]
		});
		if (pending) {
			const result = pending.result as { reviewCount?: number; totalReviews?: number } | null;
			return json({
				success: true,
				importing: true,
				importProgress: pending.progress || 0,
				importStatus: {
					reviewCount: result?.reviewCount || 0,
					totalReviews: result?.totalReviews || 0
				},
				reviewsLoading: true,
				reviewData: [],
				placeData: placeData(location ?? null),
				displaySettings: {},
				customCss: ''
			});
		}
	}

	return json({
		success: true,
		reviewsLoading: false,
		importing: false,
		reviewData,
		placeData: placeData(location ?? null),
		displaySettings: settings?.displaySettings || {},
		customCss: settings?.customCss || ''
	});
};
