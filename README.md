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
- \# For art you will need to get API keys for one or all of FanArt, TVDB, and/or TMDB and add them to your .env file
- $ docker run --name=watchlist --volume=/usr/share/watchlist/android/:/root/.android/ --volume=/usr/share/watchlist/data/:/usr/src/watchlist/data/ --network=host --restart=unless-stopped --env-file=/usr/share/watchlist/.env --detach=true ghcr.io/tthomas48/watchlist:latest


## Develop

### Account setup
- Setup an ngrok account, this allows a tunnel to your development machine:
  https://ngrok.com
  In the setup instructions click on 'Static Domain' to get your free static domain
- Put your auth token in your .env file as NGROK_AUTHTOKEN
- Put your staic domain in your .env file as NGROK_DOMAIN
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
- \# For art you will need to get API keys for one or all of FanArt, TVDB, and/or TMDB and add them to your .env file
- $ npm run start-dev

## Database Tasks

### Generate models
- npx sequelize-cli model:generate --name User --attributes firstName:string,lastName:string,email:string --models-path=models --migrations-path=migrations

### Generate migration
- npx sequelize-cli migration:create --migrations-path=migrations/ --name my_migration_name

### Running migrations
- npx sequelize-cli db:migrate