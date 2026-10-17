# Business logic

Voting rules live below. Browse-improvement design plans (not all shipped yet):

| Plan | Doc |
|------|-----|
| Streaming freshness + on-demand rentals | [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md) |
| Synopsis / metadata API + WebUI detail | [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md) |
| Genres + moods (“I feel like”) | [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md) |
| People / recommenders | [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md) |
| Trailers | [TRAILERS.md](./TRAILERS.md) |

Related: [VOTING_SESSIONS.md](./VOTING_SESSIONS.md), [ANDROID_VOTING_HOST.md](./ANDROID_VOTING_HOST.md).

---

# Voting session business logic

## Round 1 (swipe)

- Pool: non-hidden watchables on the list at session create (`pool_ids` snapshot).
- Each turn: random title from pool minus excluded and finalists.
- Every participant votes `want` or `reject`.
- **Unanimous `want`** → title becomes a finalist (max 3).
- **Any `reject`** → title is excluded for this session.
- Repeat until 3 finalists or pool exhausted.

## Round 2 (final)

- Present the finalists (1–3 if pool ran out early).
- Each participant picks one (`pick`).
- **Plurality wins**; ties broken randomly server-side.

## Launch

- Winner must have `web_url` or play returns 400.
- Host web UI and `play-winner` use the session `service_type` (`adb-googletv` or `browser`).

## Open join model

- No login for voters; `code` in `/vote/:code` is the secret.
- `participantId` dedupes votes only; it is not authenticated.
- Session start is participant-initiated from phones; the host display is read-only during lobby.

## Edge cases

| Case | Behavior |
|------|----------|
| Pool exhausted before 3 unanimous picks | Final round with 1–2 finalists |
| Round 2 tie | Random among tied titles |
| Missing `web_url` on winner | Play fails with clear error |
| Session idle 4h | Marked `cancelled` on read |
| Duplicate display names | Allowed |
| Revote same item | Upsert — one vote per participant per phase/item |

## List refresh on GET /api/watchlist

- Watchlist JSON is served from the local DB (filtered/sorted rows).
- When `RefreshStatuses.lastRefresh` for the list is older than **24 hours** (or missing), Trakt sync is kicked off.
- If the list already has rows, refresh runs **in the background** and the response returns current DB rows immediately (no wait for Trakt).
- If the list has **no** rows yet, GET **awaits** the first sync so a never-synced list is not returned as `[]`.
- Manual `GET /api/refresh/...` always starts refresh in the background and returns current rows.
- `POST` add-to-list still **awaits** refresh after mutating Trakt.

## Watchable metadata

- `overview` and `year` sync from Trakt on list refresh.
- `rogerebert_url` is editable in the watchable editor; optional Lookup fills it via slug URL check.
- Vote serialize includes `year`, `trailerUrl`, and `recommenders` (camelCase). Browse/TV use `/api/watchlist/...` snake_case rows (`overview`, `year`, `rogerebert_url`, `trailer_url`, `genres`, `moods`, `recommenders`) — [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md).
- WebUI: poster opens a detail sheet (synopsis, year, Ebert link); Edit is an explicit action from detail or the card menu.

## Max / HBO Max play URLs

- `play.max.com`, `www.max.com`, `play.hbomax.com`, and `www.hbomax.com` are the same Max provider.
- Google TV / ADB play normalizes those hosts to `https://play.max.com` (HTTPS, no query string) and uses Android component `com.wbd.stream/com.wbd.beam.BeamActivity`.
- Homepage paths like `www.max.com/shows/{slug}/{uuid}` become `play.max.com/show/{uuid}`.
- Stored `web_url` values may still use legacy `hbomax.com` hosts; matching and rewrite happen at play time.

---

# Streaming availability & rentals

*(Target rules from [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md) — implement with that plan.)*

- **Subscription** is the normal save/play path (`web_url` + service ids). Watchables are **never** saved as rental-only.
- Persist a **subscription snapshot** on the watchable (`streaming_options_json`, `streaming_checked_at`), filtered by `UserStreamingAccess`. Treat as stale after ~24h; refresh on list refresh or explicit refresh.
- **Rentals** are on-demand: `GET .../rentals` returns current MotN `rent` / `buy` options with prices. Short TTL cache OK; do not treat rental catalogs as the stored play target.
- Opening a rent link for a one-off play does not change persisted `web_url` unless the user explicitly edits it.
- List payloads may include subscription summary + staleness; they must not embed full rental price lists on every row.

---

# Genres, moods, and feel-like filters

See [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md).

- Global catalogs: `Moods`, `Genres`, `GenreMoodMaps` (install-wide). Editable in **Settings → Moods**.
- Sync Trakt genres onto the watchable on list refresh unless `genres_locked`; derive `moods` from the DB genre→mood map every refresh (including locked titles).
- Editing genres on a watchable sets `genres_locked` and recomputes moods; custom genres are upserted into the `Genres` catalog.
- Saving moods/mappings via `PUT /api/moods` recomputes moods on all watchables.
- List filters (single-select each, **AND** combined): `genre`, `mood`, `decade`, `media_type`, `q`, `personId`.
- Vote session create with `use_list_filters: true` plus the same facet fields (including `personId`) subsets `pool_ids`.

---

# People and recommenders

See [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md).

- People belong to the logged-in account (`userId`); not Trakt users or cast/crew.
- Many-to-many with watchables via `WatchablePeople`; `personIds` on add/edit replaces the recommender set.
- Deleting a person removes join rows; deleting a watchable removes its joins.
- Browse/watchlist payloads include snake_case `recommenders: [{ id, name, avatar_url }]`.
- Vote serialize includes camelCase `recommenders: [{ id, name, avatarUrl }]`.
- `GET /api/watchlist/...?personId=` filters to titles linked to that person.
- Vote session create may pass `personId` with `use_list_filters` to subset `pool_ids`.

---

# Trailers

See [TRAILERS.md](./TRAILERS.md).

- `Watchables.trailer_url` syncs from Trakt `trailer` on list refresh (`createWatchable` / `updateWatchable`).
- `GET /api/watchables/:id/trailer` returns `{ trailerUrl }`; on miss, looks up Trakt videos, write-through when found.
- Watchlist rows expose `trailer_url`; vote serialize exposes `trailerUrl`.
- **Trailer** and **Play** are separate actions; trailer never overwrites `web_url`.
- WebUI plays trailers in a dialog (`react-player`); non-embeddable URLs open in a new tab.
- Null trailer is allowed; Trailer control hides after an on-demand miss.
- TV cast of trailers is deferred; API still exposes `trailerUrl` for later clients.
