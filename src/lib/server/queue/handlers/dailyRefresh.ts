/**
 * daily-refresh handler — cron fan-out that enqueues an incremental review
 * import for every connected location. Framework-agnostic (worker process).
 */
import { randomUUID } from 'crypto';
import { getWorkerDb } from '../db';
import { locations, jobStatus } from '../../../shared/db/schema';
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

	console.log(`[worker] daily-refresh enqueued ${all.length} location(s)`);
}
