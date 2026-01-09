import type { RequestHandler } from './$types';
import { getOfflineSessionId } from '$lib/server/shopify';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { db } from '$lib/server/db';
import { session as sessionTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface ScopesUpdatePayload {
	current: string[];
	previous: string[];
}

export const POST: RequestHandler = async ({ request }) => {
	const { shop, payload } = await authenticateWebhook<ScopesUpdatePayload>(request);

	const currentScopes = payload.current.join(',');
	const sessionId = getOfflineSessionId(shop);

	await db
		.update(sessionTable)
		.set({ scope: currentScopes })
		.where(eq(sessionTable.id, sessionId));

	console.log(`Updated scopes for ${shop}: ${currentScopes}`);

	return new Response();
};
