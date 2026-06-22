/**
 * Reviews service — querying/filtering reviews for the merchant UI and the
 * storefront widget. SvelteKit-side (uses `$lib/server/db`).
 */
import { db } from '$lib/server/db';
import { reviews, locations, type ReviewFilters } from '$lib/shared/db';
import { eq, and, gte, desc, asc, sql } from 'drizzle-orm';

export type Review = typeof reviews.$inferSelect;
export type Location = typeof locations.$inferSelect;

/** Get reviews for a location with the location's stored filters applied. */
export async function getFilteredReviews(
	placeId: string,
	filters: ReviewFilters,
	limit = 50,
	offset = 0
): Promise<Review[]> {
	const conditions = [eq(reviews.placeId, placeId), eq(reviews.hidden, false)];

	if (filters.reviewFilter !== 'all') {
		const minStars =
			filters.reviewFilter === '5_only'
				? 5
				: filters.reviewFilter === '4_and_up'
					? 4
					: filters.reviewFilter === '3_and_up'
						? 3
						: 0;
		if (minStars > 0) conditions.push(gte(reviews.stars, minStars));
	}

	let orderBy;
	switch (filters.sortBy) {
		case 'highest_rating':
			orderBy = [desc(reviews.stars), desc(reviews.publishedAtDate)];
			break;
		case 'lowest_rating':
			orderBy = [asc(reviews.stars), desc(reviews.publishedAtDate)];
			break;
		case 'most_recent':
		default:
			orderBy = [asc(reviews.displayOrder), desc(reviews.publishedAtDate)];
			break;
	}

	const result = await db
		.select()
		.from(reviews)
		.where(and(...conditions))
		.orderBy(...orderBy)
		.limit(limit)
		.offset(offset);

	// Keyword filtering in JS (more flexible than SQL LIKE). Drops reviews whose
	// text contains any filtered keyword.
	if (filters.filterKeywords?.length) {
		const keywords = filters.filterKeywords.map((k) => k.toLowerCase());
		return result.filter((review) => {
			if (!review.text) return true;
			const text = review.text.toLowerCase();
			return !keywords.some((keyword) => text.includes(keyword));
		});
	}

	return result;
}

/** Count reviews for a location. */
export async function getReviewCount(placeId: string, onlyVisible = true): Promise<number> {
	const conditions = [eq(reviews.placeId, placeId)];
	if (onlyVisible) conditions.push(eq(reviews.hidden, false));

	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(reviews)
		.where(and(...conditions));

	return Number(result[0]?.count || 0);
}

/** Toggle a review's manual hidden flag (scoped to the owning shop). */
export async function updateReviewVisibility(
	shop: string,
	reviewId: string,
	hidden: boolean
): Promise<Review | null> {
	const result = await db
		.update(reviews)
		.set({ hidden, updatedAt: new Date() })
		.where(and(eq(reviews.reviewId, reviewId), eq(reviews.shop, shop)))
		.returning();
	return result[0] || null;
}

/** How many reviews a given widget style should fetch. */
function widgetLimit(widgetType: string): number {
	if (widgetType.includes('grid')) return 50;
	if (widgetType.includes('carousel')) return 20;
	return 20;
}

/** Get reviews + location formatted for storefront widget display. */
export async function getReviewsForWidget(
	placeId: string,
	widgetType: string
): Promise<{ reviews: Review[]; location: Location | null }> {
	const location = await db.query.locations.findFirst({
		where: eq(locations.placeId, placeId)
	});
	if (!location) return { reviews: [], location: null };

	const filters = location.reviewFilters || {
		sortBy: 'most_recent',
		reviewFilter: 'all',
		filterKeywords: []
	};

	const reviewList = await getFilteredReviews(placeId, filters, widgetLimit(widgetType));
	return { reviews: reviewList, location };
}
