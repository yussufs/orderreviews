/**
 * Thin enqueue/cancel helpers used by the web process (webhooks, API routes).
 * Each returns the pg-boss job id (or null) so callers can persist it for
 * later cancellation. Framework-agnostic (no `$lib`/`$env`).
 */
import {
	getBoss,
	QUEUE,
	type ReviewFetchPayload,
	type FeedbackEmailPayload,
	type FollowupEmailPayload
} from './boss';

/** Enqueue a Google-reviews import job. Returns the job id. */
export async function enqueueReviewFetch(payload: ReviewFetchPayload): Promise<string | null> {
	const boss = await getBoss();
	// Use the job-status id as the pg-boss job id so the UI can poll by one id.
	return boss.send(QUEUE.reviewFetch, payload, { id: payload.jobStatusId });
}

/**
 * Schedule the initial post-order feedback email after `delaySeconds`.
 * singletonKey = reviewRequestId de-dupes accidental double scheduling.
 */
export async function enqueueFeedbackEmail(
	payload: FeedbackEmailPayload,
	delaySeconds: number
): Promise<string | null> {
	const boss = await getBoss();
	return boss.sendAfter(
		QUEUE.feedbackEmail,
		payload,
		{ singletonKey: payload.reviewRequestId },
		Math.max(0, Math.floor(delaySeconds))
	);
}

/** Schedule a follow-up reminder email after `delaySeconds`. Returns the job id. */
export async function enqueueFollowupEmail(
	payload: FollowupEmailPayload,
	delaySeconds: number
): Promise<string | null> {
	const boss = await getBoss();
	return boss.sendAfter(
		QUEUE.followupEmail,
		payload,
		{ singletonKey: `${payload.reviewRequestId}:${payload.attempt}` },
		Math.max(0, Math.floor(delaySeconds))
	);
}

/** Cancel still-scheduled follow-up jobs (no-op for jobs already completed). */
export async function cancelFollowups(ids: string[]): Promise<void> {
	if (!ids.length) return;
	const boss = await getBoss();
	try {
		await boss.cancel(QUEUE.followupEmail, ids);
	} catch (err) {
		console.error('[queue] failed to cancel follow-ups', err);
	}
}

/** Cancel a scheduled initial feedback email (e.g. on app uninstall). */
export async function cancelFeedbackEmail(id: string): Promise<void> {
	const boss = await getBoss();
	try {
		await boss.cancel(QUEUE.feedbackEmail, id);
	} catch (err) {
		console.error('[queue] failed to cancel feedback email', err);
	}
}
