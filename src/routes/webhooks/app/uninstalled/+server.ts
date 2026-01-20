import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { db } from '$lib/server/db';
import { session as sessionTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const { shop } = await authenticateWebhook(request);

	try {
		// Delete all sessions for this shop
		await db.delete(sessionTable).where(eq(sessionTable.shop, shop));
		console.log(`Deleted sessions for ${shop}`);
	} catch (err) {
		console.error('Error deleting sessions:', err);
	}

	return new Response();
};
