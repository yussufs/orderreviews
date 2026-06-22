/**
 * Standalone pg-boss worker.
 *
 * A long-lived process, separate from the SvelteKit web app, that consumes the
 * background queues. Run with `pnpm worker` (or `pnpm worker:dev` to watch).
 * On a single Node host, run this alongside the web process.
 *
 * Uses relative imports + `process.env` only (no `$lib`/`$env`) so it runs under
 * `tsx` without the SvelteKit runtime.
 */
import 'dotenv/config';

import { getBoss, QUEUE } from './lib/server/queue/boss';
import type {
	ReviewFetchPayload,
	FeedbackEmailPayload,
	FollowupEmailPayload
} from './lib/server/queue/boss';
import { handleReviewFetch } from './lib/server/queue/handlers/reviewFetch';
import { handleFeedbackEmail } from './lib/server/queue/handlers/feedbackEmail';
import { handleFollowupEmail } from './lib/server/queue/handlers/followupEmail';
import { handleDailyRefresh } from './lib/server/queue/handlers/dailyRefresh';

async function main(): Promise<void> {
	const boss = await getBoss();
	console.log('[worker] pg-boss started, queues ready');

	// Apify imports are slow & rate-limited — keep concurrency low.
	await boss.work<ReviewFetchPayload>(QUEUE.reviewFetch, { localConcurrency: 2 }, async (jobs) => {
		for (const job of jobs) await handleReviewFetch(job.data);
	});

	await boss.work<FeedbackEmailPayload>(
		QUEUE.feedbackEmail,
		{ localConcurrency: 5 },
		async (jobs) => {
			for (const job of jobs) await handleFeedbackEmail(job.data);
		}
	);

	await boss.work<FollowupEmailPayload>(
		QUEUE.followupEmail,
		{ localConcurrency: 5 },
		async (jobs) => {
			for (const job of jobs) await handleFollowupEmail(job.data);
		}
	);

	await boss.work(QUEUE.dailyRefresh, async (jobs) => {
		for (const _job of jobs) await handleDailyRefresh();
	});

	// Daily incremental review refresh at 03:00 (server time).
	await boss.schedule(QUEUE.dailyRefresh, '0 3 * * *');

	console.log('[worker] handlers registered; daily refresh scheduled');
}

async function shutdown(): Promise<void> {
	console.log('[worker] shutting down...');
	try {
		const boss = await getBoss();
		await boss.stop({ graceful: true });
	} catch (err) {
		console.error('[worker] error during shutdown', err);
	}
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
	console.error('[worker] fatal startup error', err);
	process.exit(1);
});
