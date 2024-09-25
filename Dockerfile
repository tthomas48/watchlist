FROM --platform=linux/amd64 node:20-alpine AS build

WORKDIR /usr/src/watchlist

COPY . .
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /usr/src/watchlist
RUN apk update && apk add --no-cache android-tools
COPY --from=build /usr/src/watchlist/node_modules ./node_modules
COPY --from=build /usr/src/watchlist .
RUN ./node_modules/.bin/node-gyp install --directory=./node_modules/sqlite3 --target_platform=linux --target_arch=armv7 --target=20.11.1

CMD [ "npm", "run", "start" ]