# Voting sessions API

Jackbox-style voting for a Trakt playlist. Phones join via URL; the host (web or Android) creates the session and launches the winner.

## Authentication

| Client | Auth |
|--------|------|
| Host (web) | Trakt OAuth session cookie |
| Android host | `Authorization: Bearer <trakt_access_token>` |
| Phone voters | **None** — session `code` in the URL is the only gate |

## Create session

`POST /api/vote-sessions`

**Auth:** host (session or Bearer)

**Body:**
```json
{
  "trakt_list_id": "12345",
  "trakt_list_user_slug": "username",
  "service_type": "adb-googletv"
}
```

**Response:**
```json
{
  "id": "uuid",
  "code": "ABC123",
  "joinUrl": "https://your-host/vote/ABC123"
}
```

Android (and the web host) should generate a QR code locally from `joinUrl`.

## Poll session state

`GET /api/vote-sessions/:code`

**Auth:** none

Returns lobby, active, final, and complete state. Poll every ~1s during play.

```json
{
  "code": "ABC123",
  "joinUrl": "https://your-host/vote/ABC123",
  "status": "active",
  "phase": "round1",
  "serviceType": "adb-googletv",
  "participants": [{ "id": "uuid", "displayName": "Alice" }],
  "currentCandidate": {
    "id": 42,
    "title": "Movie",
    "imageUrl": "/api/vote-sessions/ABC123/img/42",
    "overview": "...",
    "rogerebertUrl": "https://www.rogerebert.com/reviews/...",
    "webUrl": "https://..."
  },
  "finalists": [],
  "voteProgress": { "submitted": 2, "required": 4 },
  "winner": null
}
```

## Join (phones)

`POST /api/vote-sessions/:code/join`

**Body:** `{ "displayName": "Alice" }`

**Response:** `{ "participantId": "uuid", "session": { ... } }`

Store `participantId` in `sessionStorage` and send it on every vote.

## Start (phones)

`POST /api/vote-sessions/:code/start`

**Auth:** none

**Body:** `{ "participantId": "uuid" }`

Any joined participant may start the session when at least one player has joined. The host display (`/vote-host/:code`) is read-only during lobby.

## Vote (phones)

`POST /api/vote-sessions/:code/vote`

**Body:**
```json
{
  "participantId": "uuid",
  "vote": "want",
  "watchableId": 42
}
```

- Round 1: `vote` is `want` or `reject` ( `watchableId` optional; server uses current candidate)
- Round 2: `vote` is `pick`, `watchableId` must be one of the three finalists

## Cancel (host)

`POST /api/vote-sessions/:code/cancel`

## Play winner (host / Android)

`POST /api/vote-sessions/:code/play-winner`

**Auth:** host

Requires `status === "complete"` and winner `web_url` set. Uses the session’s `service_type`.

Alternative: `POST /api/play/:service_type/:watchable_id` with the winner id.

## Android TV host

Full integration guide for the separate Android repo: **[ANDROID_VOTING_HOST.md](./ANDROID_VOTING_HOST.md)**.

Summary:

1. Trakt OAuth → `access_token`
2. `GET /api/lists` → pick list (`ids.trakt`, `user.username`)
3. **Start Voting** → `POST /api/vote-sessions` with Bearer → `code`, `joinUrl`
4. Render QR from `joinUrl` on TV; poll `GET /api/vote-sessions/:code` every ~1s
5. **Lobby:** show `participants` count/names; phones call `POST .../join` and `POST .../start` (TV does not start)
6. **Round 1 / final:** display `currentCandidate` or `finalists` and `voteProgress` from poll
7. **Complete:** show `winner`; user taps Play → `POST /api/vote-sessions/:code/play-winner` (Bearer)

## Roger Ebert lookup (watchable editor)

`POST /api/watchables/:id/rogerebert-lookup` — session auth; returns `{ "url": "..." | null }` and saves when found.
