FROM node:22-alpine

WORKDIR /usr/src/watchlist

COPY . .
RUN npm ci --omit=dev
RUN npm run build-ui

CMD [ "npm", "run", "start" ]
