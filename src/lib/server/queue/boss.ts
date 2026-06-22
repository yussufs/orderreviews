/**
 * pg-boss queue layer (framework-agnostic).
 *
 * Shared by BOTH the SvelteKit web process (to enqueue) and the standalone
 * worker (`src/worker.ts`, to consume). Therefore: NO `$lib`/`$env` imports —
 * reads `process.env.DATABASE_URL` directly (works in adapter-node SSR and under
 * `tsx`). pg-boss creates and owns its own `pgboss.*` schema on `start()`.
 *
 * pg-boss v12 notes baked into this module:
 * - Queues must be created (`createQueue`) before send/work — see `ensureQueues`.
 * - `work()` handlers receive an ARRAY of jobs.
 * - `cancel(name, id)` needs the queue name, so cancellation helpers know which.
 */
import { PgBoss } from 'pg-boss';

export const QUEUE = {
	reviewFetch: 'review-fetch',
	feedbackEmail: 'feedback-email',
	followupEmail: 'followup-email',
	dailyRefresh: 'daily-refresh'
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

// ----- Job payloads -----

export interface ReviewFetchPayload {
	shop: string;
	placeId: string;
	/** id of the matching `job_status` row for UI progress */
	jobStatusId: string;
	/** ISO date — only fetch reviews newer than this (incremental refresh) */
	lastFetchDate?: string;
	maxReviews?: number;
}

export interface FeedbackEmailPayload {
	shop: string;
	reviewRequestId: string;
}

export interface FollowupEmailPayload {
	shop: string;
	reviewRequestId: string;
	attempt: number;
}

export type DailyRefreshPayload = Record<string, never>;

// ----- Singleton -----

let bossPromise: Promise<PgBoss> | null = null;

/**
 * Lazily construct + start a single PgBoss instance, ensuring all queues exist.
 * Safe to call repeatedly; the same started instance is returned.
 */
export function getBoss(): Promise<PgBoss> {
	if (!bossPromise) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL is required for pg-boss');

		const boss = new PgBoss(url);
		boss.on('error', (err) => console.error('[pg-boss] error', err));

		bossPromise = boss
			.start()
			.then(() => ensureQueues(boss))
			.then(() => boss)
			.catch((err) => {
				// Reset so a later call can retry instead of caching a rejected promise.
				bossPromise = null;
				throw err;
			});
	}
	return bossPromise;
}

/**
 * Create every queue with its retry/expiry policy. Idempotent — pg-boss
 * `createQueue` is a no-op if the queue already exists with the same options.
 */
async function ensureQueues(boss: PgBoss): Promise<void> {
	await Promise.all([
		// Apify imports are slow — generous expiry, a few retries with backoff.
		boss.createQueue(QUEUE.reviewFetch, {
			policy: 'standard',
			retryLimit: 3,
			retryBackoff: true,
			expireInSeconds: 15 * 60
		}),
		boss.createQueue(QUEUE.feedbackEmail, {
			policy: 'standard',
			retryLimit: 3,
			retryBackoff: true,
			expireInSeconds: 2 * 60
		}),
		boss.createQueue(QUEUE.followupEmail, {
			policy: 'standard',
			retryLimit: 3,
			retryBackoff: true,
			expireInSeconds: 2 * 60
		}),
		// Singleton policy so overlapping cron ticks can't double-run the fan-out.
		boss.createQueue(QUEUE.dailyRefresh, {
			policy: 'singleton',
			retryLimit: 1,
			expireInSeconds: 10 * 60
		})
	]);
}
