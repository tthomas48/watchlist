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

## Watchable metadata

- `overview` and `year` sync from Trakt on list refresh.
- `rogerebert_url` is editable in the watchable editor; optional Lookup fills it via slug URL check.
- Vote serialize should include `year` (camelCase). Browse/TV use `/api/watchlist/...` snake_case rows. Planned additive fields (see design docs): `genres`, `moods`, subscription streaming snapshot, `recommenders`, `trailer_url` — [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md).
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

*(Target rules from [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md).)*

- Sync Trakt genres onto the watchable on list refresh.
- Derive `moods` from a curated genre→mood map (v1); titles may have multiple moods.
- List filters: single `genre` and/or `mood` query params (AND when both set).
- Optional: vote session create accepts `genre` / `mood` to subset `pool_ids`.
- Parallel facet: filter by recommender `personId` — [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md).

---

# People and recommenders

*(Target rules from [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md).)*

- People belong to the logged-in account (`userId`); not Trakt users or cast/crew.
- Many-to-many with watchables; `personIds` on add/edit replaces the recommender set.
- Deleting a person removes join rows; deleting a watchable removes its joins.
- API exposes `recommenders[]` on watchable payloads; `?personId=` filters lists.
- Optional: vote session `personId` subsets the pool.

---

# Trailers

*(Target rules from [TRAILERS.md](./TRAILERS.md).)*

- `trailer_url` syncs from Trakt when available; on-demand lookup may write through if missing.
- **Trailer** and **Play** are separate actions; trailer never overwrites `web_url`.
- Null trailer is allowed; UI hides or disables Trailer when absent after lookup.
- TV cast of trailers is deferred; API still exposes `trailerUrl` for later clients.
