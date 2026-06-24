import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { getDashboard, type DashboardRange } from '$lib/server/services/dashboard';

/** GET /app/api/dashboard?range=30d|all — aggregated home dashboard stats. */
export const GET: RequestHandler = async ({ request, url }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const range: DashboardRange = url.searchParams.get('range') === 'all' ? 'all' : '30d';
	const data = await getDashboard(auth.session.shop, range);
	return json(data);
};
