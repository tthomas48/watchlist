FROM --platform=linux/amd64 node:20-alpine AS build

WORKDIR /usr/src/watchlist

COPY . .
RUN npm ci --omit=dev
RUN npm run build-ui

FROM node:20-alpine

WORKDIR /usr/src/watchlist
RUN apk update && apk add --no-cache android-tools
COPY --from=build /usr/src/watchlist/node_modules ./node_modules
COPY --from=build /usr/src/watchlist .
RUN npm install sqlite3

CMD [ "npm", "run", "start" ]