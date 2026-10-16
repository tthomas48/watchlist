# People / recommenders

Design plan for an account-scoped People roster (name + avatar), attaching recommenders on add/edit, showing them like the streaming-source badge, and filtering “Sam’s picks.” Sibling of feel-like browsing: [FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md). Also: [TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md), [STREAMING_AVAILABILITY.md](./STREAMING_AVAILABILITY.md), [TRAILERS.md](./TRAILERS.md).

## Problem / goals

Remembering *who* recommended a title is as useful as remembering *where* it streams. Free-text `comment` is a weak stand-in. Goal: first-class **People**, many-to-many with watchables, WebUI badges and manager, API for TV later — **not** Trakt users or cast/crew.

## Current behavior + gaps

| Area | Today |
|------|--------|
| Notes | `Watchable.comment` via `CommentButton` — unstructured |
| Source badge | Streaming service circular overlay on poster (`streaming_service_id`) |
| Recommenders | None |
| Filter by person | None |

## Decisions

### People model

- Table `People` scoped to the logged-in account (`userId`):
  - `id`, `userId`, `name`, `avatar` (path or URL), timestamps
- Avatars: prefer stored files under e.g. `data/img/people/` served as `/api/img/people/:id` (mirror poster pattern). v1 may allow URL-only and add upload in the same phase if straightforward.
- Initials fallback when no avatar (WebUI + TV sketch).

### Watchable link

- Join table `WatchablePeople` (`watchableId`, `personId`, unique pair).
- Optional later columns on join: `note`, `recommendedAt` — **not** required for v1.
- A title may have multiple recommenders; a person may recommend many titles.

### Not conflated with

- Trakt `User` / OAuth account
- Cast/crew from Trakt people endpoints
- Vote session display names

## Data model

```text
People
  id, userId, name, avatar, createdAt, updatedAt

WatchablePeople
  watchableId, personId
  PRIMARY / UNIQUE (watchableId, personId)
```

Associations: `User.hasMany(Person)`; `Watchable.belongsToMany(Person)`; cascade delete join rows when person or watchable removed.

## API contracts

### People CRUD

```http
GET    /api/people
POST   /api/people          { "name": "Sam", "avatarUrl": "..." }
PATCH  /api/people/:id      { "name": "...", "avatarUrl": "..." }
DELETE /api/people/:id
POST   /api/people/:id/avatar   # multipart upload (if implemented)
```

All require login; rows limited to `req.user.id`.

### Attach on watchable

Create/update watchable (add-item and edit) accept:

```json
{ "personIds": [1, 2] }
```

Replace semantics for the set of recommenders on update (full replace of join rows for that watchable).

### List / detail (watchlist)

Additive on watchable payloads from `GET /api/watchlist/...` ([TV_BROWSE_METADATA.md](./TV_BROWSE_METADATA.md)). Prefer snake_case for browse rows to match watchlisttv, e.g. nested recommenders or a compact JSON column — document the chosen shape at implementation time. Vote serialize may use camelCase `recommenders` / `avatarUrl`.

Example (illustrative):

```json
{
  "recommenders": [
    { "id": 1, "name": "Sam", "avatar_url": "/api/img/people/1" }
  ]
}
```

### Filter

```http
GET /api/watchlist/:user/:listId/?personId=1
```

### Voting (optional, with Feel Like)

`POST /vote-sessions` may accept `personId` to subset `pool_ids` (“only swipe Sam’s recommendations”).

## WebUI presentation (in scope when implementing)

| Surface | Behavior |
|---------|----------|
| **Settings → People** | List / add / edit / delete; name + avatar (upload or URL); initials preview. |
| **Add-item / edit** | Multi-select of existing people + **quick-add name** (creates Person then selects). Persist via `personIds`. |
| **Poster badge** | Circular avatar(s) on the poster, **opposite corner** from the streaming service icon. If multiple: stack up to 2, then “+N”. Tooltip / aria with names. |
| **Filter bar** | “Recommended by…” select alongside Feel Like chips ([FEEL_LIKE_BROWSING.md](./FEEL_LIKE_BROWSING.md)). |
| **Detail sheet** | Named list of recommenders with avatars. |

Visual language should match the existing streaming badge in [`WatchlistItem.jsx`](../frontend/src/WatchlistItem.jsx) (size, border, shadow).

## TV presentation (deferred — do not implement TV app now)

Rough lean-back design later:

- Focused card: small avatar + “Recommended by Sam” (or “Sam +2”).
- Filter aisle / chip: **From Sam** among feel-like controls.
- Shelf may show a tiny avatar badge if one primary recommender exists — optional, avoid clutter.
- **No TV UI work in this workstream**; ship `recommenders[]` + `personId` filter on the API.

## Out of scope (first ship)

- Sharing people across accounts / social graph
- Importing phone contacts
- Auto-detecting recommenders from `comment` text
- Rich profiles beyond name + avatar
- Join-row notes / recommendedAt (phase 2)

## Phased next steps

1. Migrations + models + CRUD routes + ownership tests.
2. `personIds` on add/edit; include `recommenders` on watchlist list/detail and vote serialize.
3. WebUI People manager, badges, filter, detail list.
4. Optional vote-session `personId`.
5. Avatar upload hardening (size/type limits).

## Tests

- CRUD scoped to user (cannot read/update another user’s person).
- Attach/replace `personIds`; delete person removes join rows.
- Filter `personId` returns only linked watchables.
- Serialize includes `recommenders` with stable `avatarUrl`.

## Related business rules

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) — People and recommenders.
