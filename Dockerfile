FROM --platform=linux/amd64 node:22-alpine AS build

WORKDIR /usr/src/watchlist

COPY . .
RUN npm ci --omit=dev
RUN npm run build-ui

FROM node:22-alpine

WORKDIR /usr/src/watchlist
RUN apk update && apk add --no-cache --virtual .build-deps android-tools sqlite sqlite-dev g++ python3-dev py3-setuptools libffi-dev openssl-dev make
RUN apk update python3
COPY --from=build /usr/src/watchlist/node_modules ./node_modules
COPY --from=build /usr/src/watchlist .
RUN npm install sqlite3 --build-from-source --sqlite=/usr

CMD [ "npm", "run", "start" ]