FROM --platform=linux/amd64 node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:18-alpine

WORKDIR /app
RUN apk update && apk add --no-cache android-tools
COPY --from=build /app/node_modules ./node_modules
COPY . .

CMD [ "npm", "run", "start" ]