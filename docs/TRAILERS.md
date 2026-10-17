# Trailers (API + WebUI play)

Design plan for exposing a trailer URL on the API and playing it in the web app. Complements synopsis/detail in [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md). Sibling plans: [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md), [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md), [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md).

## Problem / goals

A poster + title is often not enough to remember a film. A trailer is a fast reminder before committing to full playback on a subscription. Goal: **persist / fetch trailer URL from Trakt**, expose it on the API, **play in this webapp** (dialog embed). TV trailer cast is designed but **deferred**.

## Current behavior + gaps

| Area | Today |
|------|--------|
| Trailer field | None on `Watchables` |
| Trakt sync | `extended:full` already used for list items; `trailer` on movie/show objects is **not** stored |
| YouTube receiver | Exists for launching YouTube URLs on Google TV (`receiver/providers/youtube.js`) — used for content URLs, not wired to trailers |
| Play button | Launches the **title** via subscription/`web_url`, not a trailer |

## Decisions

### Source

1. Prefer Trakt `trailer` on the full movie/show object during list refresh (usually a YouTube URL).
2. If missing, on-demand fallback: Trakt videos endpoints (`/movies/{id}/videos`, `/shows/{id}/videos`) — prefer `type=trailer`, `official=true`, `site=youtube` when choosing among multiple.
3. Store whatever URL Trakt returns; do not special-case non-YouTube beyond “embed if we can, else open link.”

### Persist + expose

- Column `Watchables.trailer_url` (STRING, nullable).
- Sync in `createWatchable` / `updateWatchable` like `overview` / `year`.
- Expose `trailer_url` on `/api/watchlist/...` rows; vote serialize / `GET .../trailer` may use camelCase `trailerUrl`.

### On-demand endpoint

`GET /api/watchables/:id/trailer`

```json
{ "trailerUrl": "https://www.youtube.com/watch?v=..." }
```

or `{ "trailerUrl": null }` when unknown.

Behavior: return DB value if present; else live Trakt lookup, write-through to `trailer_url` when found, then return. Lets TV/web ask without waiting for a full list refresh.

### Trailer vs Play

- **Play** — launch the saved title (`web_url` / receiver) as today.
- **Trailer** — separate control; never overwrites `web_url`.

## Data model

```text
Watchables
  + trailer_url  STRING NULL
```

## API contracts

- Watchlist rows: include `trailer_url` (null if none).
- Vote serialize: include `trailerUrl` when useful.
- `GET /api/watchables/:id/trailer` as above.
- Auth: same as other watchable routes (session / Bearer).

Canonical field also listed in [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md).

## WebUI presentation (in scope when implementing)

| Surface | Behavior |
|---------|----------|
| **Card actions / detail sheet** | **Trailer** control next to **Play**. Hidden or disabled when `trailerUrl` is null (optional: Trailer still calls on-demand endpoint once before hiding). |
| **Player** | Modal/dialog with embedded YouTube (or current best npm player package — **check npm for latest** at implementation time). Distinct from Play-to-TV. |
| **VoteHost (nice-to-have)** | Trailer on round-1 candidate card for web host — same dialog pattern. |
| **Accessibility** | Focus trap in dialog; Esc closes; stop playback on close. |

## TV presentation (deferred — do not implement TV app now)

Rough lean-back design later:

- On focused title or vote candidate: **Trailer** control.
- Playback via YouTube app on the TV using existing receiver (`youtube` key) **or** in-app player if the TV browse supports it.
- Do **not** autoplay trailers on shelf focus.
- **No TV trailer UX / ADB cast work in this workstream** — expose `trailer_url` on watchlist (+ optional `/trailer`) so watchlisttv can adopt later.

## Out of scope (first ship)

- Hover/focus autoplay
- Multi-trailer picker UI
- Hosting video ourselves
- Special non-YouTube players beyond open-in-new-tab fallback
- Casting trailers via ADB (deferred TV)

## Phased next steps

1. Migration + sync `trailer` from Trakt full payload; tests.
2. `GET .../trailer` with write-through fallback to videos endpoint.
3. Expose `trailer_url` on `/api/watchlist/...`; add `trailerUrl` to vote serialize when useful.
4. WebUI Trailer button + dialog player (resolve player dependency version from npm).
5. Optional VoteHost trailer; document TV deferred design for Android client maintainers.

## Tests

- Refresh persists `trailer_url` when Trakt provides it; null when absent.
- On-demand endpoint returns DB hit; miss triggers lookup and persists.
- Serialize includes `trailerUrl`.
- Frontend: Trailer opens dialog when URL present (component test if practical).

## Related business rules

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — Trailers.
