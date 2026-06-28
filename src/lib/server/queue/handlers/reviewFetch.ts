/**
 * review-fetch handler — imports Google reviews via Apify for one location.
 *
 * Framework-agnostic (no `$lib`/`$env`): runs inside the standalone worker.
 * Reads the reviews actor's NESTED output (place objects with `place.reviews[]`)
 * and upserts each review. Progress is written to the `job_status` row for the
 * merchant UI to poll. Images are passed through as-is (no re-hosting in v1).
 */
import { ApifyClient } from 'apify-client';
import { eq } from 'drizzle-orm';
import { getWorkerDb } from '../db';
import { locations, reviews, jobStatus } from '../../../shared/db/schema';
import { cleanReviewText } from '../../../shared/text';
import type { ReviewFetchPayload } from '../boss';

/** Hard cap on reviews fetched per import (no per-plan limits in this app). */
const MAX_REVIEWS = 200;

const REVIEWS_ACTOR_ID =
	process.env.APIFY_GOOGLE_REVIEWS_ACTOR_ID || 'compass/crawler-google-places';

export async function handleReviewFetch(data: ReviewFetchPayload): Promise<void> {
	const { shop, placeId, jobStatusId, lastFetchDate } = data;
	const db = getWorkerDb();

	const setStatus = (fields: Partial<typeof jobStatus.$inferInsert>) =>
		db
			.update(jobStatus)
			.set({ ...fields, updatedAt: new Date() })
			.where(eq(jobStatus.id, jobStatusId));

	await setStatus({ status: 'processing', progress: 0 });

	try {
		const location = await db.query.locations.findFirst({
			where: eq(locations.placeId, placeId)
		});
		if (!location) throw new Error(`Location ${placeId} not found`);

		if (!process.env.APIFY_API_TOKEN) throw new Error('APIFY_API_TOKEN is not configured');
		const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

		const reviewsToFetch = Math.min(
			data.maxReviews ?? MAX_REVIEWS,
			location.reviewsCount || MAX_REVIEWS
		);

		const input: Record<string, unknown> = {
			placeIds: [placeId],
			maxReviews: reviewsToFetch,
			reviewsOrigin: 'google',
			personalData: true
		};
		// Incremental refresh: only reviews newer than the last fetch.
		if (lastFetchDate) input.reviewsStartDate = lastFetchDate;

		await setStatus({ progress: 10 });

		const run = await apify.actor(REVIEWS_ACTOR_ID).call(input);
		await setStatus({ progress: 50 });

		const { items } = await apify.dataset(run.defaultDatasetId).listItems();
		await setStatus({ progress: 70 });

		// The crawler returns place objects with reviews nested inside.
		let totalReviews = 0;
		for (const place of items) {
			const list = (place.reviews as Array<Record<string, unknown>>) || [];
			totalReviews += list.filter((r) => r.reviewId).length;
		}

		let reviewCount = 0;
		for (const place of items) {
			const list = (place.reviews as Array<Record<string, unknown>>) || [];
			for (const review of list) {
				if (!review.reviewId) continue;
				const reviewId = review.reviewId as string;
				const publishedAt = review.publishedAtDate
					? new Date(review.publishedAtDate as string)
					: null;

				try {
					await db
						.insert(reviews)
						.values({
							reviewId,
							shop,
							placeId,
							text: cleanReviewText(review.text as string | undefined),
							name: review.name as string | undefined,
							stars: review.stars as number | undefined,
							publishedAtDate: publishedAt,
							reviewerPhotoUrl: review.reviewerPhotoUrl as string | undefined,
							reviewImageUrls: (review.reviewImageUrls as string[]) || [],
							hidden: false,
							filtered: false,
							displayOrder: 0
						})
						.onConflictDoUpdate({
							target: reviews.reviewId,
							set: {
								text: cleanReviewText(review.text as string | undefined),
								name: review.name as string | undefined,
								stars: review.stars as number | undefined,
								publishedAtDate: publishedAt,
								reviewerPhotoUrl: review.reviewerPhotoUrl as string | undefined,
								reviewImageUrls: (review.reviewImageUrls as string[]) || [],
								updatedAt: new Date()
							}
						});

					reviewCount++;
					if (totalReviews > 0 && reviewCount % 10 === 0) {
						const progress = Math.round(70 + (20 * reviewCount) / totalReviews);
						await setStatus({ progress, result: { reviewCount, totalReviews } });
					}
				} catch (err) {
					console.error(`[worker] error storing review ${reviewId}:`, err);
				}
			}
		}

		await setStatus({ progress: 95, result: { reviewCount, totalReviews } });

		// Record fetch time for incremental refreshes.
		await db
			.update(locations)
			.set({ lastReviewFetchAt: new Date(), updatedAt: new Date() })
			.where(eq(locations.placeId, placeId));

		await setStatus({
			status: 'completed',
			progress: 100,
			result: { reviewCount, totalReviews },
			completedAt: new Date()
		});

		console.log(`[worker] review-fetch done for ${placeId}: ${reviewCount}/${totalReviews}`);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[worker] review-fetch failed for ${placeId}:`, message);
		await setStatus({ status: 'failed', error: message }).catch(() => {});
		throw err; // let pg-boss apply retry policy
	}
}
