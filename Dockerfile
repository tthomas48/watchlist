FROM node:18-alpine

WORKDIR /usr/src/watchlist

COPY package*.json ./

RUN apk update && apk add --no-cache android-tools
RUN mkdir -p /usr/src/watchlist/data/
RUN npm ci --omit=dev
COPY . .
RUN npm run build-ui
CMD [ "npm", "run", "start" ]