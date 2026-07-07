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
