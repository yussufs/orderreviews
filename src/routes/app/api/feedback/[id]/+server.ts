import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { deleteFeedback } from '$lib/server/services/review-collection';

/** DELETE /app/api/feedback/:id — delete a feedback submission. */
export const DELETE: RequestHandler = async ({ request, params }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const ok = await deleteFeedback(auth.session.shop, params.id);
	if (!ok) return json({ error: 'Not found' }, { status: 404 });
	return json({ success: true });
};
