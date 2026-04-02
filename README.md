# watchlist
Watchlist integrates with Trakt.tv to make it easy to keep track of all the series and movies you're watching. 

![Watchlist UI](images/ui.png?raw=true "UI")

You can launch showw and movies in your web browser, or play them directly on your Google TV. 

When using GoogleTV as a player there is a full remote control for selecting Profiles and Episodes.

![Watchlist Remote](images/remote.png?raw=true "Remote")

Would love assistance in adding more integrations (FireTV, others?) and writing tests and documentation.

## Running docker image
- $ mkdir -p /usr/share/watchlist/android/
- $ mkdir -p /usr/share/watchlist/data/
- $ cp .env.example /usr/share/watchlist/.env/ # and edit with your values
- \# Add the Trakt secrets (found at https://trakt.tv/oauth/applications) to the .env file
- \# Poster art comes from Trakt (including media.trakt.tv CDN URLs resolved by the app)
- $ docker run --name=watchlist --volume=/usr/share/watchlist/android/:/root/.android/ --volume=/usr/share/watchlist/data/:/usr/src/watchlist/data/ --network=host --restart=unless-stopped --env-file=/usr/share/watchlist/.env --detach=true ghcr.io/tthomas48/watchlist:latest

Copy [.env.example](.env.example) to `.env` for local runs or for the `docker run` command above. Set Trakt credentials and `SESSION_SECRET`. Optionally set **`AUTOMATION_API_KEY`** and **`AUTOMATION_USER_ID`** (numeric primary key from the `Users` table) so clients can call the JSON API with **`Authorization: Bearer`** instead of a browser session.

**Poster images:** Rows use `/api/img/{watchableId}` (files under `data/img/local/`). Trakt-backed thumbnails use `/api/img/trakt/{type}/{traktId}`; the server downloads from Trakt once into `data/img/trakt/{type}_{traktId}.jpg` and reuses that file. Bare `media.trakt.tv/...` paths are normalized to `https` only inside the server fetcher (never sent to the browser).

**Streaming availability (optional):** after you pick a Trakt row, the UI can show where to stream using the official [Streaming Availability API](https://docs.movieofthenight.com/) via the [`streaming-availability`](https://www.npmjs.com/package/streaming-availability) client ([client libraries guide](https://docs.movieofthenight.com/guide/client-libraries)). Set `RAPIDAPI_KEY` (and optionally `RAPIDAPI_HOST`, `STREAMING_AVAILABILITY_COUNTRY`) in `.env`. Use **`GET /api/streaming/availability`** (session or Bearer automation auth) with `type`, `imdb_id` or `tmdb_id`, and optional `country`. `GET /api/capabilities` (after login) exposes `{ streamingEnabled }`; omitting `RAPIDAPI_KEY` disables streaming lookups without breaking the app. See `.env.example`.

### Agent / automation API (`/api/agent/*`)

Structured routes for TV or automation clients (session cookie or **`Authorization: Bearer`** + `AUTOMATION_*`). Use numeric DB **`Watchable.id`** from list responses—do not trust free-text titles as ids without resolving them first.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/agent/lists` | Trakt lists (owned + collaborations), `{ lists: [...] }`. |
| GET | `/api/agent/watchables?trakt_list_id=&q=&include_hidden=` | Rows on one list (`include_hidden` defaults true; `q` filters title). |
| POST | `/api/agent/watchables/:id/hidden` | Body `{ "hidden": true \| false }` (grid visibility, not Trakt delete). |
| POST | `/api/agent/watchables/:id/move` | Body `{ "from": { "username", "traktListId" }, "to": { ... } }` — Trakt remove/add for movies/shows, then DB update + refresh both lists. |
| GET | `/api/agent/refresh/:trakt_list_user_id/:trakt_list_id/` | Sync one list from Trakt (like web refresh). |

### Roadmap (from project plans)

- **Provider deep links / `web_url`:** see the provider-deep-link-automation plan in-repo.


## Develop

### Account setup
- Setup an ngrok account, this allows a tunnel to your development machine:
  https://ngrok.com
  In the setup instructions click on 'Static Domain' to get your free static domain
- Put your auth token in your .env file as NGROK_AUTHTOKEN
- Put your static domain in your .env file as NGROK_DOMAIN
- Put your static domain in your .env file as __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
- Create a Trakt.tv account and setup an oauth app on Trakt.tv
  https://trakt.tv/oauth/applications
- Under Redirect URI add (put in the actual text there is no variable expansion supported):
  [NGROK_DOMAIN]/api/auth/trakt/callback
- Under CORS add:
  [NGROK_DOMAIN]


### Install Code
- $ npm i
- $ cp .env.example .env
- \# Add the Trakt secrets (found at https://trakt.tv/oauth/applications) to the .env file
- \# Poster art comes from Trakt (including media.trakt.tv CDN URLs resolved by the app)
- $ npm run start-dev

## Database Tasks

### Generate models
- npx sequelize-cli model:generate --name User --attributes firstName:string,lastName:string,email:string --models-path=models --migrations-path=migrations

### Generate migration
- npx sequelize-cli migration:create --migrations-path=migrations/ --name my_migration_name

### Running migrations
- npx sequelize-cli db:migrate