FROM node:22-alpine

WORKDIR /usr/src/watchlist

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

COPY . .
RUN pnpm run build-ui

CMD ["pnpm", "run", "start"]
