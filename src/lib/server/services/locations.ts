/**
 * Locations service — managing a shop's imported Google Places locations.
 * SvelteKit-side (uses `$lib/server/db`).
 */
import { db } from '$lib/server/db';
import { locations, reviews, type ReviewFilters } from '$lib/shared/db';
import { eq, and, desc } from 'drizzle-orm';
import type { PlaceSearchResult } from './google-places';

export type Location = typeof locations.$inferSelect;

/** All locations for a shop, newest first. */
export async function getLocationsForShop(shop: string): Promise<Location[]> {
	return db
		.select()
		.from(locations)
		.where(eq(locations.shop, shop))
		.orderBy(desc(locations.createdAt));
}

/** A single location scoped to a shop (returns null if not owned by the shop). */
export async function getLocation(shop: string, placeId: string): Promise<Location | null> {
	const rows = await db
		.select()
		.from(locations)
		.where(and(eq(locations.placeId, placeId), eq(locations.shop, shop)))
		.limit(1);
	return rows[0] || null;
}

/**
 * Insert or update a location from a Places search result, scoped to the shop.
 * placeId is the PK and is globally unique — a place can belong to one shop only.
 */
export async function upsertLocation(shop: string, place: PlaceSearchResult): Promise<Location> {
	const now = new Date();
	const result = await db
		.insert(locations)
		.values({
			placeId: place.placeId,
			shop,
			title: place.title,
			address: place.address,
			phone: place.phone,
			website: place.website,
			totalScore: place.totalScore ?? 0,
			reviewsCount: place.reviewsCount ?? 0,
			imageUrl: place.imageUrl,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: locations.placeId,
			set: {
				title: place.title,
				address: place.address,
				phone: place.phone,
				website: place.website,
				totalScore: place.totalScore ?? 0,
				reviewsCount: place.reviewsCount ?? 0,
				imageUrl: place.imageUrl,
				updatedAt: now
			}
		})
		.returning();
	return result[0];
}

/** Which shop currently owns a placeId, if any (placeId is a global PK). */
export async function getLocationOwner(placeId: string): Promise<string | null> {
	const rows = await db
		.select({ shop: locations.shop })
		.from(locations)
		.where(eq(locations.placeId, placeId))
		.limit(1);
	return rows[0]?.shop ?? null;
}

/** Delete a location (and its reviews via cascade) for a shop. */
export async function deleteLocation(shop: string, placeId: string): Promise<boolean> {
	const result = await db
		.delete(locations)
		.where(and(eq(locations.placeId, placeId), eq(locations.shop, shop)))
		.returning({ placeId: locations.placeId });
	return result.length > 0;
}

/** Update the stored review filters for a location. */
export async function updateLocationFilters(
	shop: string,
	placeId: string,
	filters: ReviewFilters
): Promise<Location | null> {
	const result = await db
		.update(locations)
		.set({ reviewFilters: filters, updatedAt: new Date() })
		.where(and(eq(locations.placeId, placeId), eq(locations.shop, shop)))
		.returning();
	return result[0] || null;
}

/** The shop's primary location placeId (first imported), or null. */
export async function getPrimaryPlaceId(shop: string): Promise<string | null> {
	const rows = await db
		.select({ placeId: locations.placeId })
		.from(locations)
		.where(eq(locations.shop, shop))
		.orderBy(locations.createdAt)
		.limit(1);
	return rows[0]?.placeId ?? null;
}

/** Stamp the manual-refresh time (used for rate limiting). */
export async function touchManualRefresh(shop: string, placeId: string): Promise<void> {
	await db
		.update(locations)
		.set({ lastManualRefreshAt: new Date(), updatedAt: new Date() })
		.where(and(eq(locations.placeId, placeId), eq(locations.shop, shop)));
}

/** Reviews for a location, scoped to a shop, for the merchant management UI. */
export async function getReviewsForLocation(shop: string, placeId: string) {
	return db
		.select()
		.from(reviews)
		.where(and(eq(reviews.placeId, placeId), eq(reviews.shop, shop)))
		.orderBy(desc(reviews.publishedAtDate));
}
