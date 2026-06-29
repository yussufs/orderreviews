import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Dev-only tooling — hidden entirely in production builds.
	if (!dev) error(404, 'Not found');
	return {};
};
