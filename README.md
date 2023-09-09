# watchlist
Watchlist integrates with Trakt.tv to make it easy to keep track of all the series and movies you're watching. 

![Watchlist UI](images/ui.png?raw=true "UI")

You can launch showw and movies in your web browser, or play them directly on your Google TV. 

When using GoogleTV as a player there is a full remote control for selecting Profiles and Episodes.

![Watchlist Remote](images/remote.png?raw=true "Remote")

Would love assistance in adding more integrations (FireTV, others?) and writing tests and documentation.

## Install
- $ npm i
- $ cp .env.example .env
- Add the Trakt secrets (found at https://trakt.tv/oauth/applications) to the .env file

## Run
- $ npm run start

The data will be saved to watchlistData.json

### Run Frontend (optional)
- $ cd frontend 
- $ npm i
- $ cp .env.example .env
- $ npm run start 
- Navigate to http://localhost:3000/ 

## Generate models
- npx sequelize-cli model:generate --name User --attributes firstName:string,lastName:string,email:string --models-path=models

## Generate migration
- npx sequelize-cli migration:create --migrations-path=migrations/ --name my_migration_name

## Running migrations
- npx sequelize-cli db:migrate

## Pushing up docker image
- gcloud auth configure-docker
- docker build -t us-docker.pkg.dev/watchlist-396421/gcr.io/watchlist:latest .
- docker push us-docker.pkg.dev/watchlist-396421/gcr.io/watchlist:latest

## Running docker image
- mkdir -p /usr/share/watchlist/data/
- cp .env.example /usr/share/watchlist/.env/ # and edit with your values
- docker run --name=watchlist --voluments=/user/share/watchlist/data/:/usr/src/watchlist/data/ --network-host --restart=unless-stopped --env-file=/usr/share/watchlist/.env --detach=true gcr.io/watchlist-396421/watchlist:latest

## Initial setup
TODO: Maybe the reconnect feature fixes this?
I haven't yet figured out how to do the initial adb setup. So I:

- docker exec -it watchlist /bin/sh
- adb connect [GOOGLE_TV_IP]

And then it asks you to accept. 

# ADB Stuff
## get current activity
- dumpsys activity | grep -E 'mCurrentFocus|mFocusedApp'
- dumpsys activity activities
- https://github.com/selfhostedshow/wiki/blob/81eacbd9352602244787866da71056faec667ae2/docs/home-automation/home-assistant/supervisor-addons/android-debug-bridge/adb.md?plain=1#L99


For AMC: Go view the show and get the URL. Put that in the android TV intent field:

https://www.amcplus.com/shows/dark-winds--1053387

For Hulu: Just use the web URL as well
