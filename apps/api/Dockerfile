FROM node:25-bookworm-slim AS build

WORKDIR /app

RUN npm install --global pnpm@10.12.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY apps/api apps/api
RUN pnpm --filter @holotransfer/api build
RUN pnpm --filter @holotransfer/api deploy --prod --legacy /runtime

FROM node:25-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /runtime ./
COPY --from=build /app/apps/api/dist ./dist

EXPOSE 43827

CMD ["node", "dist/Server.js"]
