# Feel-like browsing (genres + moods)

Design plan for video-store-style genre shelves and a smaller “I feel like…” mood layer. Sibling plans: [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md), [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md), [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md) (parallel “recommended by…” facet), [TRAILERS.md](./TRAILERS.md).

## Problem / goals

The watchlist is a flat poster pile. Old video stores at least sliced by Comedy / Drama. Goal: **persist Trakt genres**, derive a curated **mood** vocabulary, filter and optionally section the WebUI, and expose the same facets on the API for TV later (including filtered vote pools).

## Current behavior + gaps

| Capability | Today |
|------------|--------|
| Sort | `last_played`, `sortable_title` via `SortPicker` |
| Hidden | Per-item hide + show-hidden toggle |
| List switch | Trakt lists via `ListPicker` (manual “shelves” only by using multiple lists) |
| Genres | Trakt `extended:full` returns them on refresh; **discarded** in `createWatchable` / `updateWatchable` |
| Moods / “I feel like” | None |
| Vote pool | All non-hidden watchables on the list — no genre/mood subset |

## Decisions

### Genres

- Persist Trakt genre strings on the watchable as JSON array, e.g. `["comedy","drama"]` (normalize to lowercase).
- Sync on list refresh alongside `overview` / `year`.
- Column: `Watchables.genres` TEXT/JSON NULL.

### Moods

Curated vocabulary (v1 — keep small):

| Mood id | Intent |
|---------|--------|
| `light` | Easy, funny, low friction |
| `tense` | Thriller / suspense energy |
| `comfort` | Familiar / cozy rewatch vibe |
| `date_night` | Romance / chemistry-forward |
| `smart` | Dense plot / prestige / brainy |
| `scary` | Horror / dread |
| `family` | All-ages / kids-friendly |

- Store `Watchables.moods` TEXT/JSON array.
- **v1 assignment:** static **genre → mood map** applied on refresh (a title can get multiple moods). Example mapping (tune in implementation):

  - comedy → `light`
  - romance → `date_night`, `comfort`
  - horror → `scary`
  - thriller, crime → `tense`
  - drama → `smart` (and/or `comfort` when also romance — prefer explicit map table in code)
  - family, animation (when not adult-skewed) → `family`
  - science-fiction, fantasy → optional `smart` / leave unmapped if weak

- **Later:** manual mood override via edit API that is not clobbered on every refresh (e.g. `moods_locked` or separate override column). v1 can recompute moods from genres each refresh.

### Filters

- List endpoints: `?genre=comedy`, `?mood=comfort` (v1: **single** value each; AND if both set).
- Response includes `genres` and `moods` on each item so clients can build shelves client-side.
- Cross-link: `?personId=` from [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md) as a parallel feel-like facet.

### Voting

- Optional `genre` and/or `mood` on `POST /vote-sessions` to subset `pool_ids` at create (“I feel like comfort tonight”).
- Document in [VOTING_SESSIONS.md](./VOTING_SESSIONS.md) when implemented.

## Data model

```text
Watchables
  + genres  TEXT NULL  -- JSON string array
  + moods    TEXT NULL  -- JSON string array
```

Genre→mood map: module constant (e.g. `api/mood_map.js`) + unit tests — not user-editable in v1.

## API contracts

```http
GET /api/watchlist/:user/:listId/?sort=...&genre=comedy&mood=light
```

Watchable objects include:

```json
{
  "genres": ["comedy"],
  "moods": ["light"]
}
```

Vote create body (additive):

```json
{
  "trakt_list_id": "...",
  "trakt_list_user_slug": "...",
  "service_type": "adb-googletv",
  "genre": "comedy",
  "mood": "comfort"
}
```

## WebUI presentation (in scope when implementing)

| Surface | Behavior |
|---------|----------|
| **Toolbar** | Neighbor to `SortPicker`: **“I feel like…”** mood chips (single-select, clearable) + **genre** dropdown (single-select, clearable). |
| **View mode** | Toggle **Flat** (default grid) vs **Shelves** — group into horizontal sections by genre *or* by mood (doc default: shelves by **genre** when Flat→Shelves; if a mood filter is active, one section is enough). |
| **Empty filter** | Clear copy (“No titles match”) + **Clear filters**. |
| **Start Voting** | When a mood/genre filter is active, checkbox: “Only vote on filtered titles” (passes through to session create). |
| **Detail sheet** | Show genre/mood chips read-only (edit override is a later phase). |

## TV presentation (deferred — do not implement TV app now)

Rough lean-back design later:

- Top row of large **mood / genre chips**; selection filters the shelf.
- Alternate: vertical **aisles** (labeled rows of posters) — classic video-store.
- Vote host create flow can offer the same chips before session start.
- **No TV UI work in this workstream**; API filters + fields only.

## Out of scope (first ship)

- ML recommendations
- Free-form user tags
- Cross-list “all my shelves” mega-view
- Multi-select genre/mood filters (v1 is single)

## Phased next steps

1. Migration + sync genres from Trakt full payload; mood map module + tests.
2. Query filters on `/api/watchlist/...`; include `genres` / `moods` in JSON.
3. WebUI chips + optional shelves mode.
4. Optional vote-session pool filters.
5. Manual mood lock (phase 2).

## Tests

- Refresh writes genres; moods match map.
- Filter query returns only matching rows (AND when both params set).
- Vote create with `mood` subsets `pool_ids`.
- Unknown genre strings do not crash map (empty moods OK).

## Related business rules

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — Genres, moods, and feel-like filters.
