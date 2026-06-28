# Importing Google Reviews

How the app finds a merchant's Google business, pulls in its reviews, keeps them
fresh, and tracks growth over time. Everything heavy runs in the background
through the **pg-boss** queue and the standalone **worker** (`src/worker.ts`,
run with `pnpm worker`).

## End-to-end flow

```
Merchant searches business         (Google Places API, live)
        │  selects a result
        ▼
POST /app/api/locations            upsert into `locations`, enqueue review-fetch
        │
        ▼
pg-boss queue: 'review-fetch'  ──►  worker handler (Apify) ──► upsert `reviews`
        │                                                       update job_status
        ▼
Widget / Reviews page / Dashboard read from Postgres
```

## 1. Searching for a business (Google Places API)

`src/lib/server/services/google-places.ts` calls Places API (New):

- `searchPlaces(query)` → `POST /places:searchText` (up to 10 results)
- `getPlaceDetails(placeId)` → place details (used when importing)

Returns `{ placeId, title, address, phone, website, totalScore (rating),
reviewsCount (Google's total count), imageUrl }`.

`/app/api/locations/search?q=` calls this; if the Places API errors/quotas out it
falls back to the **Apify** place-search actor (`src/lib/server/services/apify.ts`).
The merchant UI is a **search-button** flow (not autocomplete) to conserve API
quota — see `/app/locations` and the onboarding wizard `/app/onboarding`.

`GOOGLE_PLACES_API_KEY` is required.

## 2. Importing a location

`POST /app/api/locations { placeId }` (`src/routes/app/api/locations/+server.ts`):

1. `placeId` is the **global primary key** of `locations` — a place can belong to
   one shop only (returns 409 otherwise).
2. `getPlaceDetails` populates the row (title, rating, `reviewsCount`, image…).
3. `startReviewFetch(shop, placeId)` (`src/lib/server/services/jobs.ts`) creates a
   `job_status` row and enqueues a **`review-fetch`** job (the job id == the
   `job_status` id, so the UI can poll one id).

## 3. The review-fetch worker (Apify)

`src/lib/server/queue/handlers/reviewFetch.ts` (framework-agnostic — runs in the
worker, uses `process.env` + the worker DB, never `$lib`/`$env`):

1. Loads the location, marks `job_status` → `processing`.
2. Calls the Apify actor `APIFY_GOOGLE_REVIEWS_ACTOR_ID`
   (default `compass/crawler-google-places`) via `apify-client` `.call()`, then
   reads the run's dataset.
3. The actor returns **place objects with reviews NESTED** (`place.reviews[]`) —
   the handler double-loops and **upserts** each review on conflict (`reviewId`).
4. **Review text is cleaned** on the way in via `cleanReviewText`
   (`src/lib/shared/text.ts`): `<br>` → newline, other HTML stripped, entities
   decoded. (See [WIDGET.md](./WIDGET.md) for how line breaks render.)
5. Progress is written to `job_status` (10 → 50 → 70–90 → 95 → 100). On success
   it sets `locations.lastReviewFetchAt` and marks the job `completed`; on error
   it marks `failed` and rethrows so pg-boss applies retry/backoff.

**Import cap:** `MAX_REVIEWS = 200` per location. This means
`count(*)` on the `reviews` table caps at ~200 — for the _real_ total review
count always use `locations.reviewsCount` (the Google-reported number).

Env: `APIFY_API_TOKEN`, `APIFY_GOOGLE_REVIEWS_ACTOR_ID`,
`APIFY_GOOGLE_PLACE_SEARCH_ACTOR_ID`.

> Watch-out: Apify's free tier has a memory cap; large concurrent runs can fail
> with "exceed the memory limit" — that's an Apify plan limit, not an app bug.

## 4. Refreshing & the daily cron

- **Manual refresh** — `POST /app/api/reviews/refresh { placeId }` re-enqueues an
  **incremental** fetch (passes `lastReviewFetchAt` as `reviewsStartDate`),
  rate-limited to once per hour per location (`lastManualRefreshAt`, 429 on
  cooldown).
- **Daily cron** — `boss.schedule('daily-refresh', '0 3 * * *')` runs
  `src/lib/server/queue/handlers/dailyRefresh.ts`, which:
  1. Enqueues an incremental `review-fetch` for **every** location.
  2. Upserts a **daily snapshot** of each shop's total review count
     (`sum(locations.reviewsCount)`) into `review_snapshots` (one row per
     shop/day) — this powers the dashboard "Reviews growth" sparkline.

## 5. Managing reviews (merchant)

- **`/app/reviews`** — searchable/filterable table (rating, status, location)
  with **hide/unhide** per review (`PATCH /app/api/reviews { reviewId, hidden }`,
  shop-scoped). Hidden reviews are excluded from the widget.
- `getAllReviewsForShop` / `getReviewsForWidget`
  (`src/lib/server/services/locations.ts`, `…/reviews.ts`) apply the location's
  stored filters (`reviewFilters`: sort, min-stars, keyword exclusions).

## Data model (key tables)

| Table              | Notes                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `locations`        | PK `placeId`; `reviewsCount` = real Google total; `totalScore` = avg rating; `reviewFilters`; `lastReviewFetchAt`, `lastManualRefreshAt` |
| `reviews`          | PK `reviewId`; cascade-deletes with its location; `hidden` flag; cleaned `text`                                                          |
| `job_status`       | UI progress for imports (id == pg-boss job id); `pending`/`processing`/`completed`/`failed`                                              |
| `review_snapshots` | `(shop, day)` unique; daily total review count for the growth chart                                                                      |

## Troubleshooting

- **Widget stuck "importing…"** → an orphaned `job_status` row
  (`pending`/`processing`) for the location, usually from a worker stopped
  mid-run. Mark it `failed` (or delete it). The proxy now ignores rows older than
  15 min and never shows the splash once reviews exist.
- **Nothing imports** → is `pnpm worker` running? Jobs queue in `pgboss.job`
  until a worker consumes them. The worker reads `.env` directly via
  `dotenv/config` (it isn't started by the Shopify CLI).
