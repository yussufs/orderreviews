# Storefront Review Widget

The widget renders a store's imported Google reviews on the storefront. It's a
self-contained, framework-agnostic JS bundle embedded through a Shopify **theme
app extension**, and it fetches its data from the app through a Shopify **App
Proxy** (so everything stays on the merchant's own domain).

## Pieces at a glance

| Piece                                   | Location                                      | Role                                                             |
| --------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Widget source (Vite/Svelte sub-project) | `widget/`                                     | Builds the embeddable bundle                                     |
| Built bundle                            | `extensions/order-reviews/assets/widget.js`   | Loaded on the storefront                                         |
| Theme app extension                     | `extensions/order-reviews/`                   | App blocks + app embed                                           |
| Data endpoint (App Proxy)               | `src/routes/proxy/widget-settings/+server.ts` | Returns reviews + settings JSON                                  |
| Merchant config page                    | `src/routes/app/widget/+page.svelte`          | Pick design, place on storefront                                 |
| Per-shop settings storage               | `widget_settings` table                       | `widgetStyle`, `displaySettings`, `customCss`, `locationPlaceId` |

## The widget bundle (`widget/`)

A separate Vite + Svelte 5 project with its **own toolchain** (Vite 6), installed
in isolation so it doesn't collide with the root app's deps:

```bash
pnpm widget:install   # pnpm --dir widget install --ignore-workspace
pnpm widget:build     # builds an IIFE bundle -> widget/public/widget.js
pnpm widget:dev       # vite build --watch
```

The Vite config (`widget/vite.config.ts`) outputs a single IIFE
(`inlineDynamicImports`) and a `copyWidgetToAssetsPlugin` copies the result into
`extensions/**/assets/widget.js` on every build. **The bundle is git-ignored** —
it's a build artifact; rebuild it whenever you change anything under `widget/`.

### Loading & mounting (`widget/src/main.ts`)

1. The Liquid blocks add `<script src="{{ 'widget.js' | asset_url }}" defer>`.
2. On load, `main.ts` finds every element matching
   `.order-reviews-widget-wrapper, [data-order-reviews-widget], order-reviews-widget`.
3. Each container is mounted in its **own Shadow DOM** for style isolation
   (base styles from `widget/src/styles/base.css` are injected inline).
4. A `MutationObserver` re-initializes containers added later (AJAX / theme
   editor), so dynamically-injected widgets also render.
5. Config is read from element attributes (`widget-type`, `variant`,
   `location`, `myshopify-domain`, `display-*`, `custom-css`).

### Data flow (`widget/src/lib/api.ts`)

- The widget fetches the App Proxy endpoint
  `DEFAULT_ENDPOINT = /apps/order-reviews/widget-settings`.
- It **polls every 2s** while an import is in progress, and caches the last good
  response in `sessionStorage` (`order_reviews_` prefix) for instant re-render
  (stale-while-revalidate).
- `WidgetRouter.svelte` routes to the chosen design and applies theme CSS
  variables from `widget/src/lib/themes.ts`.

### Designs / variants

v1 ships **two** designs, registered in `widget/src/WidgetRouter.svelte`:

- **Grid** — `widget/src/widgets/Grid.svelte`
- **Carousel** — `widget/src/widgets/Carousel.svelte`

The architecture supports more (badge, masonry, drawer existed upstream); add a
new variant by creating `widget/src/widgets/<Name>.svelte`, importing it in
`WidgetRouter.svelte`, and exposing it as a `widgetStyle`
(`order_reviews_<name>`) + a Liquid block.

**Theming** lives in `widget/src/lib/themes.ts` — ~40 CSS custom properties
(`--dragonio-*`, kept as internal names) with preset palettes (`default`, `dark`,
`off-white`, `light-purple`, `pink`, `green`, `blue`, `yellow`) plus per-block
`custom_css`. Review text uses `white-space: pre-line` so paragraph breaks (from
cleaned `<br>`s — see [IMPORTING_REVIEWS.md](./IMPORTING_REVIEWS.md)) render
properly.

## Theme app extension (`extensions/order-reviews/`)

Three Liquid entry points in `blocks/`:

- `order-reviews-grid.liquid` — **app block** (`target: section`), product/section placement
- `order-reviews-carousel.liquid` — **app block**
- `order-reviews-embed.liquid` — **app embed** (`target: body`), global/site-wide placement

Each renders `<order-reviews-widget widget-type="order-reviews-grid" …>` with the
shop domain and block settings (color, location, custom CSS). `shopify.app.toml`
declares the `[app_proxy]` (`subpath = order-reviews`, `url = <host>/proxy`).

## App Proxy data endpoint (`/proxy/widget-settings`)

Storefront `https://{shop}/apps/order-reviews/widget-settings` → `/proxy/widget-settings`.
Returns `{ reviewData, placeData, displaySettings, customCss }`.

Key behaviours:

- **Location resolution** — by `placeId`, else the Nth imported location by the
  `location` param (defaults to the first).
- **Importing splash** — returns `importing: true` **only** on a first import
  (no reviews yet) **and** when a `fetch_reviews` job is recent (updated within
  15 min). A background refresh never blanks an already-populated widget, and a
  stale/orphaned job can't block it forever.
- `placeData.review_link` points at the **hosted review form**
  (`/apps/order-reviews/review`), not Google directly — see
  [FEEDBACK.md](./FEEDBACK.md).
- Signature is verified when present (`verifyProxySignature`); skipped in dev
  when Shopify doesn't include it.

## Merchant configuration (`/app/widget`)

Pick **Grid** or **Carousel** (auto-saves on selection), then **Add widget to
storefront** via a page-selector dropdown that deep-links into the theme editor
(`addAppBlockUrl` / `openAdminLink` from `src/lib/admin-links.ts`), or activate
the **global app embed**. There's no location dropdown — the widget falls back to
the shop's primary location automatically.

## Common tasks

- **Changed widget code?** `pnpm widget:build`, then redeploy the extension
  (`shopify app deploy`) or it's picked up in `shopify app dev`.
- **Widget stuck on "importing…"?** Check for a stale `job_status` row
  (`status in ('pending','processing')`) for the location; see
  [IMPORTING_REVIEWS.md](./IMPORTING_REVIEWS.md). The 15-min recency guard
  prevents permanent blocking, but a truly stuck worker still needs attention.
- **Storefront password** (dev stores) sits in front of App Proxy pages — disable
  it to test the widget/forms, and make sure the proxy URL is synced to the tunnel.
