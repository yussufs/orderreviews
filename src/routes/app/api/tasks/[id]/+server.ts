import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { getJobStatus } from '$lib/server/services/jobs';

/** GET /app/api/tasks/:id — poll a review-import job's progress. */
export const GET: RequestHandler = async ({ request, params }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const task = await getJobStatus(auth.session.shop, params.id);
	if (!task) return json({ error: 'Not found' }, { status: 404 });
	return json({ task });
};
