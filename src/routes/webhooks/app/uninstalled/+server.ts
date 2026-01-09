import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { db } from '$lib/server/db';
import { session as sessionTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const { shop } = await authenticateWebhook(request);

	// Delete all sessions for this shop
	await db.delete(sessionTable).where(eq(sessionTable.shop, shop));
	console.log(`Deleted sessions for ${shop}`);

	return new Response();
};
