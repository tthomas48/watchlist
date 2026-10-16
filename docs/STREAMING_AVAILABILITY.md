# Streaming availability and on-demand rentals

Design plan for fresher “where can I watch this on my subscriptions?” data and an always-available rent/buy lookup. Sibling plans: [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md), [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md), [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md), [TRAILERS.md](./TRAILERS.md). Rules summary: [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md).

## Problem / goals

1. **Stale / incomplete subscription data** — After add-item, availability is not stored on the watchable. List refresh syncs Trakt metadata only. When deciding what to watch, the app often cannot answer “is this on a service I pay for?”
2. **Rentals as a fallback, not a save mode** — Users normally play from a subscription. If none of their services have the title (or they simply want options), they need **current** rent/buy locations and prices via API. Watchables are **never** saved as rental-only.

## Current behavior + gaps

| Area | Today |
|------|--------|
| Source | Movie of the Night Streaming Availability API via RapidAPI (`streaming-availability` client) |
| When fetched | Only in add-item (`GET /api/streaming/availability`) |
| Cache | In-memory 5 minutes, max 50 keys — not persisted |
| Stored on watchable | Chosen `web_url`, `streaming_service_id`, `streaming_addon_id` only |
| Rent / buy | Filter treats `rent` and `buy` as “rental options”; `includeRentals` defaults **false** and the WebUI never sets it — TVOD never appears |
| UI `mode=rent` | Means “ignore subscription profile / show all non-filtered options,” **not** TVOD |
| User profile | `UserStreamingAccess` (country, direct services, add-ons) filters subscription mode |
| List refresh | Trakt membership + metadata; **no** streaming re-check |

Relevant code: `api/streaming_availability_client.js`, `api/streaming_options_filter.js`, `frontend/src/AddItem.jsx`, `models/user_streaming_access.js`.

## Decisions

### Product model

- **Normal path:** Pick a subscription (or free) option → persist `web_url` + service ids → Play uses that.
- **Fallback path:** Client calls a rentals endpoint for live rent/buy + prices. Response is informational / one-off play. It does **not** redefine how the item is stored unless the user explicitly changes `web_url`.
- Rename today’s misleading add-item `mode=rent` to something like `all` / `unfiltered` if kept. True TVOD is a separate concern (`types=rent,buy` or dedicated route).

### Subscription freshness

- Persist a **subscription-oriented snapshot** on each watchable:
  - `streaming_options_json` — TEXT/JSON of matched (or compact) subscription options for the user’s profile at check time
  - `streaming_checked_at` — timestamp
- Refresh when older than **~24 hours**, on Trakt list refresh (best-effort per item / batch), or on explicit refresh.
- Snapshot is filtered using `UserStreamingAccess` (same rules as today’s subscription mode).
- List/detail payloads expose a **summary** (service ids/names, links, `checkedAt`, `stale` flag). Do **not** embed full rental catalogs on every list row.

### Rentals = on-demand API

- Dedicated endpoint, e.g. `GET /api/watchables/:id/rentals` (auth required).
- Always able to return current MotN `rent` / `buy` options with `price` when present (`amount`, `currency`, `formatted`).
- Short in-memory TTL (reuse or mirror the 5-minute MotN cache) is fine; do not persist rental catalogs on the watchable as source of truth.
- Any watchable with `imdb_id` or `tmdb_id` can request this, regardless of subscription snapshot.
- Optional: client may open/play a rent link once; default UX does not write that link back as the saved play target.

### Filter layer

- Stop unconditionally dropping rent/buy when the rentals endpoint needs them.
- Keep subscription snapshot path excluding TVOD unless product explicitly wants a “also rentable” hint at add time (hint only, not save-as-rental).

## Data model

```text
Watchables
  + streaming_options_json  TEXT NULL   -- subscription snapshot (JSON)
  + streaming_checked_at    DATETIME NULL
```

Suggested snapshot JSON (compact):

```json
{
  "country": "us",
  "subscription": [
    {
      "serviceId": "netflix",
      "serviceName": "Netflix",
      "type": "subscription",
      "addonId": null,
      "link": "https://..."
    }
  ]
}
```

No change to `web_url` semantics. `justwatch_id` remains unused legacy.

## API contracts

### List / detail (additive)

On watchlist payloads (`GET /api/watchlist/...`), include something like:

```json
{
  "streaming": {
    "checkedAt": "2026-10-15T12:00:00.000Z",
    "stale": false,
    "subscription": [
      {
        "serviceId": "netflix",
        "serviceName": "Netflix",
        "type": "subscription",
        "addonId": null,
        "link": "https://..."
      }
    ]
  }
}
```

Existing `streaming_service_id` / `web_url` remain the play target.

### Rentals (on demand)

`GET /api/watchables/:id/rentals`

```json
{
  "checkedAt": "2026-10-15T12:05:00.000Z",
  "options": [
    {
      "serviceId": "prime",
      "serviceName": "Prime Video",
      "type": "rent",
      "price": { "amount": "3.99", "currency": "USD", "formatted": "$3.99" },
      "link": "https://..."
    },
    {
      "serviceId": "apple",
      "serviceName": "Apple TV",
      "type": "buy",
      "price": { "amount": "12.99", "currency": "USD", "formatted": "$12.99" },
      "link": "https://..."
    }
  ]
}
```

Errors: not configured (`RAPIDAPI_KEY`), missing ids, upstream failure — clear `ok` / status codes consistent with existing availability route.

### Refresh

- Hook subscription snapshot refresh into list refresh and/or `POST /api/watchables/:id/streaming/refresh`.
- Capabilities continue to expose `streamingEnabled`.

## WebUI presentation (in scope when implementing)

| Surface | Behavior |
|---------|----------|
| **Poster grid** | Keep circular streaming-service badge from `streaming_service_id`. If snapshot has **no** subscription matches (and check succeeded), show a subtle secondary cue (muted badge or small “Rent?” affordance) — **no prices on the card**. |
| **Detail sheet** (see metadata plan) | “Where to watch” block: subscription matches from snapshot + “as of” timestamp + Refresh. Button **Check rentals** loads rentals endpoint into a list (store, rent/buy, price). Optional **Open / Play once** does not re-save as rental-only by default. |
| **Add-item** | Subscription picker remains primary. Optional “also rentable on…” hint only. Rename misleading Rent mode → `all` / unfiltered if retained. Saving still chooses subscription/free/none — never rental-only. |
| **Settings → Streaming** | Unchanged profile drives subscription snapshot filtering. |

## TV presentation (deferred — do not implement TV app now)

Rough lean-back design for the **existing** TV browse client later:

- **Shelf / grid:** Service logo badge only (same as today). No rental prices on posters.
- **Focused title card:** Logos for “on your plan” from subscription summary. If empty, a **Rent options** control fetches `/rentals` and shows a simple D-pad list (store + price) under the synopsis.
- API fields above are enough for that client; **no TV UI work in this workstream**.

## Out of scope (first ship)

- Persisting a “preferred rental store”
- Background cron refreshing every title’s rent prices
- JustWatch reintegration
- Price-history analytics
- Saving items as rental-only

## Phased next steps

1. Migration for snapshot columns; filter + rentals endpoint with tests (price passthrough, never drop rent/buy on that path).
2. Persist/refresh subscription snapshot on list refresh and stale read.
3. Expose streaming summary on `/api/watchlist/...` JSON (additive fields).
4. WebUI: detail “Where to watch” + Check rentals; add-item mode rename/hint.
5. Document TV (watchlisttv) field adoption in [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md).

## Tests

- `streaming_options_filter`: subscription vs rentals vs unfiltered; rent ≠ buy in output.
- Rentals endpoint: MotN mock → prices/links; missing key → not configured.
- Snapshot round-trip on refresh; `stale` flag after threshold.
- Regression: add-item subscription save still writes `web_url` only for chosen subscription option.

## Related business rules

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — Streaming availability & rentals.
