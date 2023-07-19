# watchlist
Find movies and shows from your Trakt.tv watchlist available on Netflix and Prime Video

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

## Running migrations
- npx sequelize-cli db:migrate