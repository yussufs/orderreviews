import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest, AuthError } from '$lib/server/shopify/auth';

export const GET: RequestHandler = async ({ request, url }) => {
	const searchQuery = url.searchParams.get('search') || '';

	let admin;
	try {
		const auth = await authenticateRequest(request);
		admin = auth.admin;
	} catch (err) {
		const status = err instanceof AuthError ? 401 : 500;
		return json(
			{ error: 'Unauthorized' },
			{
				status,
				headers: { 'X-Shopify-Retry-Invalid-Session-Request': '1' }
			}
		);
	}

	try {
		const response = await admin.graphql(
			`#graphql
			query GetProducts($first: Int!, $query: String) {
				products(first: $first, query: $query) {
					edges {
						node {
							id
							title
							status
							createdAt
							featuredMedia {
								preview {
									image {
										url
										altText
									}
								}
							}
							variants(first: 1) {
								edges {
									node {
										price
										inventoryQuantity
									}
								}
							}
						}
					}
				}
			}`,
			{
				variables: {
					first: 25,
					query: searchQuery || null
				}
			}
		);

		if (response.errors) {
			console.error('GraphQL errors:', response.errors);
			return json({
				products: [],
				error: response.errors[0]?.message || 'Failed to fetch products'
			});
		}

		interface ProductNode {
			id: string;
			title: string;
			status: string;
			createdAt: string;
			featuredMedia?: {
				preview?: {
					image?: { url: string; altText?: string };
				};
			};
			variants: {
				edges: Array<{ node: { price: string; inventoryQuantity?: number } }>;
			};
		}

		const responseData = response.data as {
			products?: { edges?: Array<{ node: ProductNode }> };
		};

		const products =
			responseData.products?.edges?.map((edge) => ({
				id: edge.node.id,
				title: edge.node.title,
				status: edge.node.status,
				createdAt: edge.node.createdAt,
				image: edge.node.featuredMedia?.preview?.image?.url || null,
				imageAlt: edge.node.featuredMedia?.preview?.image?.altText || edge.node.title,
				price: edge.node.variants.edges[0]?.node?.price || '0.00',
				inventory: edge.node.variants.edges[0]?.node?.inventoryQuantity ?? null
			})) || [];

		return json({ products });
	} catch (err) {
		console.error('Error fetching products:', err);
		return json({
			products: [],
			error: 'Failed to fetch products'
		});
	}
};
