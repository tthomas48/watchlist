FROM --platform=linux/amd64 node:18-alpine AS build

WORKDIR /usr/src/watchlist

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:18-alpine

WORKDIR /usr/src/watchlist
RUN apk update && apk add --no-cache android-tools
COPY --from=build /usr/src/watchlist/node_modules ./node_modules
COPY . .

CMD [ "npm", "run", "start" ]