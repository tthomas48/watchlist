# Feel-like browsing (genres + moods + facets)

Design plan for video-store-style genre shelves and a smaller “I feel like…” mood layer, plus cheap AND-combined browse facets. Sibling plans: [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md), [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md), [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md) (parallel “recommended by…” facet), [TRAILERS.md](./TRAILERS.md).

## Problem / goals

The watchlist is a flat poster pile. Old video stores at least sliced by Comedy / Drama. Goal: **persist Trakt genres**, derive a curated **mood** vocabulary, filter and optionally section the WebUI, and expose the same facets on the API for TV later (including filtered vote pools).

## Current behavior + gaps

| Capability | Today |
|------------|--------|
| Sort | `last_played`, `sortable_title` via `SortPicker` |
| Hidden | Per-item hide + show-hidden toggle |
| List switch | Trakt lists via `ListPicker` (manual “shelves” only by using multiple lists) |
| Genres / moods | Persisted on refresh; moods from genre→mood map |
| Facets | Single-select mood, genre, decade, media type, title search (AND) |
| Vote pool | Optional subset via `use_list_filters` + facet fields |

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
- **v1 assignment:** static **genre → mood map** applied on refresh (a title can get multiple moods). Mapping lives in `api/mood_map.js`.
- **Later:** manual mood override via edit API that is not clobbered on every refresh (e.g. `moods_locked` or separate override column). v1 recomputes moods from genres each refresh.

### Filters

Single-select per facet; **AND** across facets (e.g. comedy + 1980s). No multi-select within a facet.

| Facet | Query param | Notes |
|-------|-------------|--------|
| Mood | `mood` | e.g. `comfort` |
| Genre | `genre` | e.g. `comedy` |
| Decade | `decade` | e.g. `1980` → year 1980–1989 |
| Type | `media_type` | `movie` \| `show` |
| Title search | `q` | Case-insensitive substring on `title` |
| Recommended by | `personId` | **Reserved** — ignored until [PEOPLE_RECOMMENDERS.md](./PEOPLE_RECOMMENDERS.md) |

Response includes `genres` and `moods` on each item so clients can build shelves client-side.

### Voting

- Optional facets on `POST /vote-sessions` when `use_list_filters: true` to subset `pool_ids`.
- Documented in [VOTING_SESSIONS.md](./VOTING_SESSIONS.md).

## Data model

```text
Watchables
  + genres  TEXT NULL  -- JSON string array
  + moods    TEXT NULL  -- JSON string array
```

Genre→mood map: module constant (`api/mood_map.js`) + unit tests — not user-editable in v1.

## API contracts

```http
GET /api/watchlist/:user/:listId/?sort=...&genre=comedy&mood=light&decade=1980&media_type=movie&q=blade
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
  "use_list_filters": true,
  "genre": "comedy",
  "mood": "comfort",
  "decade": 1980,
  "media_type": "movie",
  "q": "blade"
}
```

## WebUI presentation

| Surface | Behavior |
|---------|----------|
| **Toolbar** | One row: **Sort**, **Filter** button (opens modal; badge = active facet count), chips for each active facet (delete clears that facet), **Clear all** when filtered, **Flat / Shelves** toggle, **Add**. |
| **Filter modal** | Mood chips, genre / decade / type, title search, disabled “Recommended by… Soon” placeholder. Changes apply live; **Done** closes. |
| **View mode** | **Flat** (default grid) vs **Shelves** — horizontal sections by genre. When any facet is active, stay flat. Preference is stored **per Trakt list** (`watchlist.viewModeByList`); switching lists restores that list’s last Flat/Shelves choice (unknown lists default to Flat). |
| **Empty filter** | Clear copy (“No titles match”) + **Clear filters**. |
| **Start Voting** | When any facet is active, checkbox: “Only vote on filtered titles” (default on; passes through to session create). |
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
- Multi-select within a facet
- Streaming subscription browse filter (see [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md))
- Real `personId` filter (placeholder UI only)

## Tests

- Refresh writes genres; moods match map.
- Filter query returns only matching rows (AND when multiple params set).
- Decade bounds; `q` substring.
- Vote create with filters subsets `pool_ids`; empty filtered pool → 400.
- Unknown genre strings do not crash map (empty moods OK).

## Related business rules

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — Genres, moods, and feel-like filters.
