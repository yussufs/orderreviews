import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import {
	getWidgetSettings,
	saveWidgetSettings,
	type WidgetSettingsInput
} from '$lib/server/services/widget-settings';

const VALID_STYLES = ['order_reviews_grid', 'order_reviews_carousel'] as const;

/** GET /app/api/widget-settings — current widget config for the shop. */
export const GET: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	const settings = await getWidgetSettings(auth.session.shop);
	return json({ settings });
};

/** PUT /app/api/widget-settings — save widget config. Body: WidgetSettingsInput. */
export const PUT: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	let body: WidgetSettingsInput;
	try {
		body = (await request.json()) as WidgetSettingsInput;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!VALID_STYLES.includes(body.widgetStyle)) {
		return json({ error: 'Invalid widgetStyle' }, { status: 400 });
	}

	const settings = await saveWidgetSettings(auth.session.shop, body);
	return json({ settings });
};
