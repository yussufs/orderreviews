/**
 * daily-refresh handler — cron fan-out that enqueues an incremental review
 * import for every connected location. Framework-agnostic (worker process).
 */
import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { getWorkerDb } from '../db';
import { locations, jobStatus, reviewSnapshots } from '../../../shared/db/schema';
import { enqueueReviewFetch } from '../enqueue';

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

	console.log(
		`[worker] daily-refresh enqueued ${all.length} location(s), snapshotted ${shops.length} shop(s)`
	);
}
