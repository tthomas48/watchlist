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

### Moods and genres (editable catalogs)

Install-wide DB catalogs (seeded from a small default set: light, tense, comfort, date_night, smart, scary, family):

- `Moods` — slug + label + sort order
- `Genres` — slug + label (Trakt defaults + user-created)
- `GenreMoodMaps` — genre → mood links

- Store `Watchables.genres` / `Watchables.moods` as JSON slug arrays.
- Derive moods from genres + map on refresh and after Settings save / genre edit.
- `Watchables.genres_locked`: when true, Trakt refresh does not overwrite genres (still recomputes moods). Edit-form genre saves set the lock.
- **Settings → Moods** edits vocabulary + mappings (`GET`/`PUT /api/moods`).
- Watchable edit can tag genres and create custom ones (`GET`/`POST /api/genres`).

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
Moods / Genres / GenreMoodMaps   -- global catalogs
Watchables
  + genres         TEXT/JSON NULL
  + moods           TEXT/JSON NULL
  + genres_locked  BOOLEAN DEFAULT false
```

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
| **Filter modal** | Mood chips + genre dropdown from live catalogs; decade / type / search; disabled “Recommended by… Soon”. Live apply; **Done** closes. |
| **Settings → Moods** | Edit mood vocabulary and genre→mood mappings; save recomputes watchable moods. |
| **Watchable edit** | Genre multi-select + add custom genre (locks genres against Trakt overwrite). |
| **View mode** | **Flat** vs **Shelves** (per-list preference). When any facet is active, stay flat. |
| **Empty filter** | Clear copy (“No titles match”) + **Clear filters**. |
| **Start Voting** | When any facet is active, checkbox: “Only vote on filtered titles” (default on). |
| **Detail sheet** | Genre/mood chips read-only (labels from catalogs). |

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
