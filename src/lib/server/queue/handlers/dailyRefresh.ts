/**
 * daily-refresh handler — cron fan-out that enqueues an incremental review
 * import for every connected location. Framework-agnostic (worker process).
 */
import { randomUUID } from 'crypto';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { getWorkerDb } from '../db';
import {
	locations,
	jobStatus,
	reviewSnapshots,
	reviewRequests,
	feedbackSubmissions
} from '../../../shared/db/schema';
import { enqueueReviewFetch } from '../enqueue';

/**
 * Customer PII (review requests + private feedback) is hard-deleted after this
 * many days. PII is also removed on `customers/redact` / `shop/redact`; this is
 * the time-based retention limit. Keep in sync with the published privacy policy.
 */
const RETENTION_DAYS = 90;

/**
 * Purge customer PII older than the retention window. Deleting a review request
 * cascades to its linked feedback; standalone link/QR feedback (no review
 * request) is purged separately by its own age.
 */
async function purgeExpiredPii(db: ReturnType<typeof getWorkerDb>): Promise<void> {
	const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000);

	const purgedRequests = await db
		.delete(reviewRequests)
		.where(lt(reviewRequests.createdAt, cutoff))
		.returning({ id: reviewRequests.id });

	// Standalone feedback (no review_request to cascade from).
	const purgedFeedback = await db
		.delete(feedbackSubmissions)
		.where(
			and(isNull(feedbackSubmissions.reviewRequestId), lt(feedbackSubmissions.createdAt, cutoff))
		)
		.returning({ id: feedbackSubmissions.id });

	if (purgedRequests.length || purgedFeedback.length) {
		console.log(
			`[worker] retention purge: removed ${purgedRequests.length} review request(s) and ${purgedFeedback.length} standalone feedback row(s) older than ${RETENTION_DAYS} days`
		);
	}
}

export async function handleDailyRefresh(): Promise<void> {
	const db = getWorkerDb();
	const all = await db.select().from(locations);

	for (const loc of all) {
		const id = randomUUID();
		await db.insert(jobStatus).values({
			id,
			shop: loc.shop,
			type: 'fetch_reviews',
			status: 'pending',
			progress: 0,
			entityId: loc.placeId
		});
		await enqueueReviewFetch({
			shop: loc.shop,
			placeId: loc.placeId,
			jobStatusId: id,
			// Incremental: only reviews newer than the last fetch.
			lastFetchDate: loc.lastReviewFetchAt?.toISOString()
		});
	}

	// Record today's REAL total review count per shop (the Google-reported count
	// in locations.reviewsCount — not imported rows, which cap at 200/location)
	// for the dashboard growth chart. One row per shop per day.
	const day = new Date().toISOString().slice(0, 10);
	const shops = [...new Set(all.map((l) => l.shop))];
	for (const shop of shops) {
		const [{ total }] = await db
			.select({ total: sql<number>`coalesce(sum(${locations.reviewsCount}), 0)` })
			.from(locations)
			.where(eq(locations.shop, shop));
		await db
			.insert(reviewSnapshots)
			.values({ shop, day, totalReviews: Number(total) })
			.onConflictDoUpdate({
				target: [reviewSnapshots.shop, reviewSnapshots.day],
				set: { totalReviews: Number(total) }
			});
	}

	// Time-based PII retention (GDPR data minimization).
	await purgeExpiredPii(db);

	console.log(
		`[worker] daily-refresh enqueued ${all.length} location(s), snapshotted ${shops.length} shop(s)`
	);
}
