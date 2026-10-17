# Browse metadata (synopsis, year, reviews) — API, WebUI, deferred TV

Design plan so “what is this about?” is available on the API and usable in the web app, with a lean-back TV layout sketched for later. Sibling plans: [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md), [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md), [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md), [TRAILERS.md](./TRAILERS.md). Voting display reference: [VOTING_SESSIONS.md](./VOTING_SESSIONS.md), [ANDROID_VOTING_HOST.md](./ANDROID_VOTING_HOST.md).

## Problem / goals

Looking at a poster (especially while something else is on the TV) is a weak reminder of plot, year, or critical take. Voting already shows `overview` on the host; the main browse path does not. Goal: enrich **`GET /api/watchlist/...`** (and vote serialize), a **WebUI detail-first** flow, and a **deferred TV** focused-card design — without changing the Flutter TV app ([watchlisttv](https://github.com/tthomas48/watchlisttv) or local `watchlisttv`) in this workstream.

## Current behavior + gaps

| Field | Stored? | Main grid | Edit dialog | Vote serialize / host |
|-------|---------|-----------|-------------|------------------------|
| `title` | Yes | Yes | Yes | Yes |
| `overview` | Yes (Trakt refresh) | No | No | Yes (round 1 / winner) |
| `year` | Yes | No | No (Ebert slug only) | **Omitted** from serialize |
| `rogerebert_url` | Yes | No | Yes + lookup | Host link only |
| Genres / moods | No | — | — | — |
| Streaming summary | Partial badge | Icon only | — | — |
| Recommenders | No | — | — | — |
| Trailer | No | — | — | — |

- Poster click opens **edit**, not a “what’s this?” surface ([`WatchlistItem.jsx`](../frontend/src/WatchlistItem.jsx) → [`Watchable.jsx`](../frontend/src/Watchable.jsx)).
- **watchlisttv** already loads lists via `GET /api/watchlist/:username/:listId/` and maps **snake_case** fields (e.g. `web_url`). Voting uses camelCase vote-session payloads.

## Decisions

### Primary API contract: main watchlist + vote serialize

**TV browse and web grid share `GET /api/watchlist/:trakt_list_user_id/:trakt_list_id/`.**

- Keep returning Sequelize-style **snake_case** rows so watchlisttv’s `Item` parser keeps working.
- Add (or surface) fields additively; older clients ignore unknown keys:
  - Already present: `overview`, `year`, `rogerebert_url`, …
  - Planned: `genres`, `moods`, streaming snapshot fields, recommenders join data, `trailer_url` (see sibling docs).

Example watchlist row shape (illustrative; not a full dump):

```json
{
  "id": 42,
  "title": "Example",
  "year": 2019,
  "overview": "Synopsis text or null",
  "media_type": "movie",
  "web_url": "https://...",
  "streaming_service_id": "netflix",
  "streaming_addon_id": null,
  "rogerebert_url": "https://www.rogerebert.com/reviews/...",
  "comment": null,
  "hidden": false,
  "genres": ["comedy", "drama"],
  "moods": ["light", "comfort"],
  "streaming_options_json": null,
  "streaming_checked_at": null,
  "trailer_url": "https://www.youtube.com/watch?v=..."
}
```

- `genres` / `moods`: [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md)
- Streaming snapshot / rentals: [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md)
- Recommenders: [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md)
- `trailer_url`: [TRAILERS.md](./TRAILERS.md)

Automation (if any) uses these same main routes with session or Bearer `AUTOMATION_*` auth where already wired — not a parallel API family.

### Vote serialize (camelCase)

Voting host/phones already use camelCase via `serializeWatchable` in [`api/vote_session_service.js`](../api/vote_session_service.js). Extend it with at least `year`, and later `genres`, `recommenders`, `trailerUrl` as those land — so voting and browse stay consistent in *content*, even if key casing differs by endpoint family.

### Roger Ebert

- Keep URL + existing lookup (`POST .../rogerebert-lookup`). First ship: synopsis + year + link is enough (proven on VoteHost).
- Optional later: short excerpt only if a compliant source exists — **not** scraping full review HTML in v1.

## WebUI presentation (in scope when implementing)

| Surface | Behavior |
|---------|----------|
| **Poster grid** | Stay poster-dense (title + badges). No full synopsis on every card. |
| **Primary card action** | Open a **detail sheet/dialog**, not the editor. Contents: poster, title, year, overview (2–4 line clamp + “More”), Ebert link when present, streaming summary, recommenders, actions **Trailer** / **Play** / **Edit**. |
| **Edit** | Explicit control from detail (and overflow menu). Editor keeps URL, Ebert lookup, episodes, etc. |
| **Year** | Shown under title on detail (and optionally as small subtitle on card if space allows — detail is required). |
| **Controller UX** | Phone/web controlling Google TV gets memory via the detail sheet while posters are glanceable. |

## TV presentation (deferred — do not implement TV app now)

Rough design for **watchlisttv** later (API fields only in this workstream):

- **Shelf:** Posters + title (and service / people badges). No long synopsis on the shelf.
- **Focused item:** Large poster (side or background), title + year, 3–5 lines of `overview`, optional Ebert affordance, metadata row (genres / moods / recommenders). Same energy as VoteHost candidate card ([ANDROID_VOTING_HOST.md](./ANDROID_VOTING_HOST.md)).
- Client continues to call `/api/watchlist/...`; map new snake_case fields in Flutter `Item` when adopting.

## Out of scope (first ship)

- Full critic review body / HTML
- Redesigning overall grid density or column count
- Implementing TV browse UI changes
- A parallel automation-only API family

## Phased next steps

1. Ensure watchlist responses already expose `overview` / `year` / `rogerebert_url` to clients that need them (no strip).
2. Add `year` to vote serialize; tests.
3. WebUI detail sheet; move edit behind explicit action.
4. Wire additive fields as sibling plans ship.
5. Keep ANDROID_VOTING_HOST / VOTING_SESSIONS field tables in sync.

## Tests

- Watchlist JSON includes `overview`, `year`, `rogerebert_url` (null-safe) for synced items.
- Vote serialize includes `year`.
- WebUI: poster opens detail; Edit opens editor (component/regression tests as appropriate).

## Related business rules

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — Watchable metadata.
