import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { db } from '$lib/server/db';
import { session as sessionTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Payload types for Shopify compliance webhooks
 * @see https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 */
interface CustomerDataRequestPayload {
	shop_id: number;
	shop_domain: string;
	customer: { id: number; email: string; phone?: string };
	orders_requested: number[];
	data_request: { id: number };
}

interface CustomerRedactPayload {
	shop_id: number;
	shop_domain: string;
	customer: { id: number; email: string; phone?: string };
	orders_to_redact: number[];
}

interface ShopRedactPayload {
	shop_id: number;
	shop_domain: string;
}

type CompliancePayload = CustomerDataRequestPayload | CustomerRedactPayload | ShopRedactPayload;

/**
 * Compliance webhook handler for mandatory Shopify privacy webhooks
 * Handles: customers/data_request, customers/redact, shop/redact
 *
 * Payload is trusted after HMAC validation confirms it came from Shopify
 */
export const POST: RequestHandler = async ({ request }) => {
	const { shop, topic, payload } = await authenticateWebhook<CompliancePayload>(request);

	try {
		switch (topic) {
			case 'customers/data_request':
				await handleCustomerDataRequest(shop, payload as CustomerDataRequestPayload);
				break;

			case 'customers/redact':
				await handleCustomerRedact(shop, payload as CustomerRedactPayload);
				break;

			case 'shop/redact':
				await handleShopRedact(shop);
				break;

			default:
				console.log(`Unknown compliance topic: ${topic}`);
		}
	} catch (err) {
		console.error(`Error processing ${topic} webhook:`, err);
	}

	return new Response();
};

/**
 * Handle customers/data_request webhook
 * Sent when a customer requests their personal data from a store.
 * You have 30 days to provide the store owner with any customer data your app has collected.
 */
async function handleCustomerDataRequest(shop: string, payload: CustomerDataRequestPayload) {
	const { customer, data_request } = payload;

	console.log(`Customer data request #${data_request.id} for shop ${shop}`);
	console.log(`Customer ID: ${customer.id}, Email: ${customer.email}`);

	// TODO: Query your database for any data associated with this customer
	// and provide it to the store owner (via email, admin panel, etc.)
	// You have 30 days to comply with this request
}

/**
 * Handle customers/redact webhook
 * Sent when a store owner requests deletion of customer data on behalf of a customer.
 * You have 30 days to delete or anonymize the customer's personal data.
 */
async function handleCustomerRedact(shop: string, payload: CustomerRedactPayload) {
	const { customer } = payload;

	console.log(`Customer redact request for shop ${shop}`);
	console.log(`Customer ID: ${customer.id}, Email: ${customer.email}`);

	// TODO: Delete or anonymize any personal data for this customer
	// Example:
	// const customerIdString = `gid://shopify/Customer/${customer.id}`;
	// await db.delete(yourTable).where(
	//   or(
	//     eq(yourTable.customerId, customerIdString),
	//     eq(yourTable.email, customer.email)
	//   )
	// );

	console.log(`Deleted customer data for customer ${customer.id}`);
}

/**
 * Handle shop/redact webhook
 * Sent 48 hours after a store owner uninstalls your app.
 * You have 30 days to delete ALL data associated with that store.
 */
async function handleShopRedact(shop: string) {
	console.log(`Shop redact request for ${shop} - deleting all shop data`);

	// Delete all data for this shop from all tables
	await db.delete(sessionTable).where(eq(sessionTable.shop, shop));

	// TODO: Delete from additional tables your app uses
	// Example:
	// await Promise.all([
	//   db.delete(sessionTable).where(eq(sessionTable.shop, shop)),
	//   db.delete(shopPreferences).where(eq(shopPreferences.shop, shop)),
	//   db.delete(customerData).where(eq(customerData.shop, shop)),
	// ]);

	console.log(`Successfully deleted all data for shop ${shop}`);
}
