/**
 * Job helpers — bridge the merchant UI and the pg-boss queue.
 * Creates a `job_status` row (for UI progress polling) whose id is reused as the
 * pg-boss job id, then enqueues the review-fetch job.
 */
import { db } from '$lib/server/db';
import { jobStatus } from '$lib/shared/db';
import { eq } from 'drizzle-orm';
import { enqueueReviewFetch } from '$lib/server/queue/enqueue';

export type JobStatusRow = typeof jobStatus.$inferSelect;

/** Create a job-status row and enqueue a review import. Returns the job id. */
export async function startReviewFetch(
	shop: string,
	placeId: string,
	lastFetchDate?: string
): Promise<string> {
	const id = crypto.randomUUID();
	await db.insert(jobStatus).values({
		id,
		shop,
		type: 'fetch_reviews',
		status: 'pending',
		progress: 0,
		entityId: placeId
	});
	await enqueueReviewFetch({ shop, placeId, jobStatusId: id, lastFetchDate });
	return id;
}

/** Fetch a job-status row scoped to a shop. */
export async function getJobStatus(shop: string, id: string): Promise<JobStatusRow | null> {
	const rows = await db.select().from(jobStatus).where(eq(jobStatus.id, id)).limit(1);
	const row = rows[0];
	if (!row || row.shop !== shop) return null;
	return row;
}
