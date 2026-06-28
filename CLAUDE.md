# Order Reviews & Google Ratings

An embedded Shopify app (built on a SvelteKit template) with **two features**:

1. **Google Reviews display widget** — a theme app extension that shows a store's
   imported Google reviews on the storefront (grid + carousel designs, global or
   per-page placement). See [docs/WIDGET.md](docs/WIDGET.md).
2. **Post-order review collection & feedback** — after an order is paid or
   fulfilled, customers are emailed for a rating; happy customers are routed to
   Google, unhappy ones to a private feedback form. Also reachable via a shared
   link, QR code, and the widget's "Leave a Review" button.
   See [docs/FEEDBACK.md](docs/FEEDBACK.md).

Reviews are pulled in via the Google Places API (search) + an Apify actor
(import), processed through a background queue.
See [docs/IMPORTING_REVIEWS.md](docs/IMPORTING_REVIEWS.md).

## Project Overview

- **Framework**: SvelteKit 2 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Background jobs**: pg-boss (Postgres-backed) + a standalone worker (`src/worker.ts`)
- **Reviews**: Google Places API (search) + Apify actor `compass/crawler-google-places` (import)
- **Email**: AWS SES (post-order request + follow-up + merchant notify)
- **Auth**: Shopify OAuth with **expiring** offline tokens + App Bridge session tokens
- **UI**: Custom Svelte components (not Polaris) — see [docs/CUSTOM_COMPONENTS.md](docs/CUSTOM_COMPONENTS.md)

## Architecture

- The **web app** (SvelteKit) serves merchant pages under `/app/*`, the API under
  `/app/api/*`, webhooks under `/webhooks/*`, and storefront App Proxy endpoints
  under `/proxy/*` (`/apps/order-reviews/*` on the storefront).
- The **worker** (`pnpm worker`) consumes pg-boss queues: `review-fetch` (Apify
  import), `feedback-email` / `followup-email` (SES), and `daily-refresh` (3am
  cron: incremental refresh + daily review-count snapshot). It loads `.env` via
  `dotenv/config` and is **not** started by the Shopify CLI — run it separately.
- **Two DB layers**: `src/lib/shared/db/` is framework-agnostic (imported by both
  the app and the worker); `src/lib/server/db/` is the SvelteKit-bound `db`. Code
  shared with the worker (queue handlers, `email/ses.ts`, `tokens.ts`,
  `review-form-html.ts`) MUST avoid `$lib`/`$env` and use `process.env`.
  `hooks.server.ts` bridges `$env` → `process.env` so these work in the web
  process too.
- **All customer-facing review surfaces** are served on the merchant's storefront
  via the App Proxy (`https://{shop}/apps/order-reviews/...`).

## Key Directories

```
src/lib/server/shopify/    - Shopify API client + auth helpers
src/lib/server/queue/      - pg-boss setup, enqueue helpers, worker handlers
src/lib/server/services/   - DB-backed services (locations, reviews, review-collection, dashboard…)
src/lib/server/email/      - AWS SES client + email templates
src/lib/shared/db/         - Framework-agnostic Drizzle schema + connection (worker-safe)
src/lib/shared/            - Worker-safe utils (review-form-html.ts, text.ts)
src/lib/components/        - Custom Svelte UI components
src/routes/app/            - Protected merchant pages (require auth)
src/routes/app/api/        - Merchant API (session-token auth)
src/routes/proxy/          - Storefront App Proxy endpoints (widget data + review forms)
src/routes/webhooks/       - Shopify webhooks (orders, compliance, app lifecycle)
widget/                    - Standalone Vite/Svelte storefront widget bundle
extensions/order-reviews/  - Theme app extension (Liquid blocks + built widget.js)
docs/                      - Feature docs (WIDGET, IMPORTING_REVIEWS, FEEDBACK, CUSTOM_COMPONENTS)
```

## Important Files

- `src/worker.ts` - Standalone pg-boss worker (run with `pnpm worker`)
- `src/hooks.server.ts` - Auth middleware + `$env` → `process.env` bridge
- `src/lib/shared/db/schema.ts` - All Drizzle tables (single source of truth)
- `src/lib/shared/review-form-html.ts` - The hosted review form renderer (server + editor preview)
- `shopify.app.toml` - App config (scopes, webhooks, `[app_proxy]`)
- `drizzle.config.ts` - Database / migration config

## Common Commands

```bash
pnpm run dev              # Start the web dev server (Vite)
pnpm run worker           # Start the background worker (pg-boss); worker:dev to watch
shopify app dev           # Start web + tunnel + extension (recommended)
docker compose up -d      # Local PostgreSQL
pnpm run db:generate      # Generate a Drizzle migration from schema.ts
pnpm run db:migrate       # Apply migrations (preferred over db:push)
pnpm run widget:build     # Build the storefront widget bundle into the extension
pnpm run check            # svelte-check
pnpm run format           # Prettier
```

Typical dev setup runs **three** things: `shopify app dev` (web + tunnel),
`pnpm worker` (jobs), and `docker compose up -d` (Postgres).

## MCP Servers

The following MCP servers are configured for documentation lookup and development assistance:

### Svelte MCP

Official Svelte MCP server for Svelte 5 and SvelteKit documentation:

- **list-sections**: Discover available documentation sections. Use FIRST when asked about Svelte/SvelteKit topics.
- **get-documentation**: Retrieve full documentation for specific sections.
- **svelte-autofixer**: Analyze Svelte code for issues. Use when writing Svelte components.
- **playground-link**: Generate Svelte Playground links (only when requested by user).

### Shopify Dev MCP

Official Shopify MCP server for Shopify development:

- **learn_shopify_api**: Initialize context for a specific Shopify API (Admin, Storefront, Functions, Polaris, Liquid, etc.)
- **search_docs_chunks**: Search Shopify developer documentation
- **fetch_full_docs**: Retrieve full documentation pages from shopify.dev
- **introspect_graphql_schema**: Explore Shopify GraphQL schemas
- **validate_graphql_codeblocks**: Validate GraphQL queries against Shopify schemas
- **validate_component_codeblocks**: Validate Polaris component usage (for Polaris-based projects)

### Context7 MCP

Up-to-date documentation for any library:

- **resolve-library-id**: Find the Context7 library ID for a package
- **query-docs**: Retrieve documentation and code examples for any library

### Browser MCP

Browser automation for testing and debugging:

- **browser_navigate**, **browser_snapshot**, **browser_click**, etc.

## Shopify Questions

Always use the `/shopify` skill for ANY question about:

- Shopify APIs (Admin, Storefront, Partner, etc.)
- GraphQL queries/mutations for Shopify
- Liquid themes
- Shopify Functions
- Shopify app development patterns

Invoke the skill immediately as the first action - do not use Shopify MCP tools directly without going through the skill.

**Note:** This project uses custom Svelte components (not Polaris web components) for UI. See [docs/CUSTOM_COMPONENTS.md](docs/CUSTOM_COMPONENTS.md) for available components.

## GraphQL Pattern

Use the `#graphql` tag for type generation:

```typescript
const response = await admin.graphql(
	`#graphql
    query GetShop {
      shop { name }
    }
  `
);
```

After adding new queries, run `pnpm run graphql-codegen`.

## Data Loading Pattern

**Never load GraphQL data directly in `+page.server.ts` load functions.** This blocks page rendering and hurts performance.

Instead, use the async client-side pattern:

### 1. Page Server Load (`+page.server.ts`)

Return minimal data - just validate auth and pass essential info:

```typescript
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.shopify) {
		error(401, 'Not authenticated');
	}
	// Return minimal data - fetch heavy data client-side
	return { shop: locals.shopify.session.shop };
};
```

### 2. API Endpoint (`/api/[resource]/+server.ts`)

Put GraphQL queries in API endpoints:

```typescript
export const GET: RequestHandler = async ({ request }) => {
	// Authenticate via session token
	const authHeader = request.headers.get('authorization');
	const token = authHeader?.substring(7);
	// ... validate token and get session ...

	const admin = createAdmin(session);
	const response = await admin.graphql(`#graphql query { ... }`);
	return json({ data: response.data });
};
```

### 3. Svelte Page (`+page.svelte`)

Fetch data client-side with loading states:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';

	let data = $state([]);
	let isLoading = $state(true);

	onMount(async () => {
		const token = await window.shopify.idToken();
		const response = await fetch('/api/resource', {
			headers: { Authorization: `Bearer ${token}` }
		});
		data = await response.json();
		isLoading = false;
	});
</script>
```

### Benefits

- **Faster initial page load**: Page renders immediately with loading state
- **Better UX**: Users see the page structure while data loads
- **Reusable endpoints**: API routes can be used by multiple pages
- **Proper auth**: Uses App Bridge session tokens for authenticated requests

See `src/routes/app/products/` and `src/routes/api/products/` for a complete example.

## Authentication Flow

1. Protected routes are under `/app/*`
2. `hooks.server.ts` validates session tokens from Authorization header
3. Valid sessions get `locals.shopify.admin` GraphQL client
4. Invalid sessions redirect to OAuth at `/auth`

## Expiring Offline Access Tokens

Shopify is retiring non-expiring offline Admin API tokens (enforced for new
public apps from April 1, 2026; all public apps by January 1, 2027). This
template uses expiring tokens end-to-end. Offline access tokens last **1 hour**;
the **90-day** refresh token rotates on every use (the old one is invalidated
immediately). Both are stored on the `session` table (`refresh_token`,
`refresh_token_expires`) by `session-storage.ts`.

There are two code paths, both in `src/lib/server/shopify/auth.ts`:

- **Request path** (`authenticateRequest`): every embedded request carries an
  `id_token`, so when the stored session is missing a refresh token, expired
  (with a ~5 min buffer), or short on scopes, it just re-runs **token exchange**
  with `expiring: true`. No manual refresh logic needed here.
- **Background path** (`getOfflineSession(shop)`): webhooks, cron jobs, and queue
  workers have **no** `id_token`. They must obtain their admin client through
  `getOfflineSession`, which migrates legacy tokens in place
  (`migrateToExpiringToken`), refreshes near-expiry tokens (`refreshToken`), and
  throws "merchant must reopen the app" when the refresh token itself is gone or
  expired. **Never** read `session.accessToken` straight from storage in
  background code.

Gotchas:

- **Always pass `expiring: true`** to `tokenExchange` — without it Shopify still
  issues a legacy non-expiring token.
- **Token rotation race**: each refresh invalidates the previous refresh token.
  `storeSession` writes the new access + refresh token in one atomic upsert;
  multi-instance deployments should additionally wrap the refresh in a per-shop
  lock (e.g. a Postgres advisory lock).
- **403 masquerade**: a retired token fails with HTTP 403
  (`[API] Non-expiring access tokens are no longer accepted`), but the GraphQL
  client surfaces only "Forbidden". `graphql.ts` logs the real cause on 403.
- **90-day idle limit**: a shop never opened and with no background activity for
  90 days needs the merchant to relaunch the app.

## No Cookies in Admin UI Apps

**Never rely on cookies to store or persist state in embedded admin UI apps.**

Shopify app reviewers test apps with cookies disabled in their browser. Any app
that depends on cookies (for auth, sessions, CSRF tokens, preferences, or any
other variable) will fail review because the reviewer's browser silently drops
them. Embedded apps also run inside an iframe in Shopify Admin, where
third-party cookie restrictions make cookie storage unreliable for real
merchants too.

Use these instead:

- **Auth/sessions**: App Bridge session tokens (`window.shopify.idToken()`)
  sent in the `Authorization` header — never a session cookie. See the
  [Authentication Flow](#authentication-flow) and [Data Loading Pattern](#data-loading-pattern).
- **CSRF protection**: A signed/HMAC state parameter rather than a cookie-stored
  nonce (see `src/lib/server/shopify/auth.ts`).
- **Server-side persistence**: The PostgreSQL database (Drizzle).
- **Per-tab/client state**: In-memory Svelte state, URL query params, or
  `sessionStorage`/`localStorage` if a value must survive a reload — but treat
  these as best-effort, not as a substitute for server state.

When building any new admin UI feature, confirm it works end-to-end with
browser cookies disabled before considering it done.

## Admin / Theme-Editor Deep Links

**From an embedded app, never link to `{shop}.myshopify.com/admin/...` with
`_blank`. Always build `https://admin.shopify.com/store/{handle}/...` and open it
with `_top` (or an anchor with `target="_top"`).**

The app runs in an iframe on `admin.shopify.com`. A button that opens a Shopify
admin URL — e.g. a theme-editor deep link to add an app block or activate an app
embed — silently fails in two compounding ways unless both rules below are met.
The editor opens, but the block isn't added / the embed isn't toggled. (Pasting
the same resolved URL into the address bar works, which makes this easy to
misdiagnose — there's no iframe and no redirect there.)

1. **Wrong host.** Building against the legacy `{shop}.myshopify.com/admin/...`
   host causes a cross-host redirect to `admin.shopify.com/store/{handle}/...`
   that **drops the deep-link query params** (`addAppBlockId`, `activateAppId`,
   `context=apps`, `target`).
2. **Wrong navigation target.** `window.open(url, '_blank')` from the sandboxed
   iframe is the wrong primitive — unreliable (popup blocking / a fresh
   top-level nav through the redirect). Admin links must drive the **top frame**.

### Always use the helpers — don't hand-build these URLs

`src/lib/admin-links.ts` is the single sanctioned way to build and open these
links (the store handle, your `client_id`/`apiKey`, and the shop domain are all
available client-side via the `/app` layout `data.apiKey` / `data.shop`):

```svelte
<script lang="ts">
	import { AdminLink } from '$lib/components';
	import { addAppBlockUrl, activateAppEmbedUrl, openAdminLink } from '$lib/admin-links';

	let { data } = $props(); // data.shop, data.apiKey from /app layout

	const addBlock = addAppBlockUrl({
		shop: data.shop,
		apiKey: data.apiKey,
		handle: 'star-rating', // blocks/star-rating.liquid -> "star-rating"
		template: 'product'
	});
</script>

<!-- Preferred: a real anchor targeting the top frame -->
<AdminLink href={addBlock}>Add the review block</AdminLink>

<!-- Programmatic (e.g. inside an onclick): -->
<button
	onclick={() =>
		openAdminLink(
			activateAppEmbedUrl({ shop: data.shop, apiKey: data.apiKey, handle: 'analytics' })
		)}
>
	Activate app embed
</button>
```

Do **not** reach for `<Link external>` for admin destinations — it renders
`target="_blank"`, the wrong primitive here. Use `<AdminLink>` (renders
`target="_top"`) or `openAdminLink()`.

**Trade-off:** `_top` replaces the embedded app view with the destination in the
same tab; the merchant returns via the browser/admin back button. This is the
documented, reliable behaviour for admin destinations.

### Deep-link param reference (theme app extensions)

- **Add app block:**
  `…/themes/current/editor?template={template}&addAppBlockId={api_key}/{handle}&target=newAppsSection`
- **Activate app embed:**
  `…/themes/current/editor?context=apps&activateAppId={api_key}/{handle}`
- `{api_key}` = your app's `client_id` / `SHOPIFY_API_KEY` (the extension uuid
  form is deprecated — use `client_id`).
- `{handle}` = the block's liquid filename without `.liquid`
  (`blocks/foo.liquid` → `foo`).
- `target=newAppsSection` is the only target **all** JSON templates are
  guaranteed to support. `mainSection` silently falls back on templates whose
  main section doesn't accept app blocks (e.g. `cart`), so `addAppBlockUrl`
  defaults to `newAppsSection`.

## UI Components

This project uses custom Svelte components instead of Polaris web components. Build your own components styled to match Shopify admin aesthetics.

**App Bridge web components** (the `s-` prefixed ones like `s-app-nav`) are still available for:

- `s-app-nav` - App navigation menu
- `s-app-window` - Fullscreen modal windows
- `data-save-bar` attribute on forms - Automatic save bar integration
- Title bar - Admin title bar component

For all other UI (buttons, tables, forms, cards, etc.), create custom Svelte components in `src/lib/components/`.

Full documentation: [docs/CUSTOM_COMPONENTS.md](docs/CUSTOM_COMPONENTS.md)

| Component     | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `Page`        | Main page container with header, actions, and aside layout |
| `Card`        | Content container with title, actions, and footer slots    |
| `Button`      | Versatile button with variants, tones, and link support    |
| `TextField`   | Text input with label, validation, prefix/suffix           |
| `Select`      | Dropdown select input                                      |
| `Checkbox`    | Checkbox input with label and help text                    |
| `Switch`      | Toggle switch for boolean settings                         |
| `SearchField` | Search input with clear button                             |
| `DataTable`   | Table component with styling                               |
| `Badge`       | Status badge with color tones                              |
| `Banner`      | Alert/notification banner                                  |
| `Spinner`     | Loading spinner                                            |
| `Skeleton`    | Loading placeholder with shimmer animation                 |
| `Text`        | Typography component with variants                         |
| `Link`        | Styled link component                                      |
| `Divider`     | Horizontal divider line                                    |
| `Icon`        | SVG icon component                                         |
| `EmptyState`  | Empty state placeholder                                    |

## Code Style (Prettier)

Follow these formatting conventions when generating code:

- **Indentation**: Use tabs (not spaces)
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use semicolons
- **Trailing commas**: None
- **Print width**: 100 characters
- **Svelte**: Uses `prettier-plugin-svelte` for `.svelte` files

Run `pnpm run format` to auto-format, or `pnpm run lint` to check formatting.
