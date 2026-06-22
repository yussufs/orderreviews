import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { getFeedbackForShop } from '$lib/server/services/review-collection';

/** GET /app/api/feedback — private feedback inbox for the shop. */
export const GET: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const feedback = await getFeedbackForShop(auth.session.shop);
	return json({ feedback });
};
