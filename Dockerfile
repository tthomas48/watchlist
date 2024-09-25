FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN apk update && apk add --no-cache android-tools
RUN npm ci --omit=dev

FROM node:18-alpine

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY . .

CMD [ "npm", "run", "start" ]