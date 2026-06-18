import { describe, it, expect } from 'vitest';
import { storeHandle, adminBase, addAppBlockUrl, activateAppEmbedUrl } from './admin-links';

const SHOP = 'foo.myshopify.com';
const API_KEY = 'a47fad88032c9fec521d884c91eb827b';

describe('storeHandle', () => {
	it('strips the .myshopify.com suffix', () => {
		expect(storeHandle(SHOP)).toBe('foo');
	});

	it('leaves an already-bare handle untouched', () => {
		expect(storeHandle('foo')).toBe('foo');
	});
});

describe('adminBase', () => {
	it('builds the resolved admin.shopify.com host (never myshopify.com/admin)', () => {
		const base = adminBase(SHOP);
		expect(base).toBe('https://admin.shopify.com/store/foo');
		expect(base).not.toContain('myshopify.com');
	});
});

describe('addAppBlockUrl', () => {
	it('builds a theme-editor add-block deep link with the safe default target', () => {
		expect(
			addAppBlockUrl({ shop: SHOP, apiKey: API_KEY, handle: 'star-rating', template: 'product' })
		).toBe(
			`https://admin.shopify.com/store/foo/themes/current/editor?template=product&addAppBlockId=${API_KEY}/star-rating&target=newAppsSection`
		);
	});

	it('defaults target to newAppsSection (the only target all JSON templates support)', () => {
		expect(
			addAppBlockUrl({ shop: SHOP, apiKey: API_KEY, handle: 'foo', template: 'cart' })
		).toContain('&target=newAppsSection');
	});

	it('honours an explicit mainSection target', () => {
		expect(
			addAppBlockUrl({
				shop: SHOP,
				apiKey: API_KEY,
				handle: 'foo',
				template: 'index',
				target: 'mainSection'
			})
		).toContain('&target=mainSection');
	});

	it('uses client_id/handle (not the deprecated uuid form) for addAppBlockId', () => {
		expect(
			addAppBlockUrl({ shop: SHOP, apiKey: API_KEY, handle: 'foo', template: 'index' })
		).toContain(`addAppBlockId=${API_KEY}/foo`);
	});
});

describe('activateAppEmbedUrl', () => {
	it('builds a theme-editor app-embed activation deep link', () => {
		expect(activateAppEmbedUrl({ shop: SHOP, apiKey: API_KEY, handle: 'analytics' })).toBe(
			`https://admin.shopify.com/store/foo/themes/current/editor?context=apps&activateAppId=${API_KEY}/analytics`
		);
	});
});
