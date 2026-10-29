FROM node:25-bookworm-slim AS build

WORKDIR /app

RUN npm install --global pnpm@10.12.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY apps/web apps/web

ARG VITE_API_URL
ARG VITE_API_PREFIX=/api
ARG VITE_WS_URL
ARG VITE_WS_PATH=/transfer
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_PREFIX=${VITE_API_PREFIX}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_WS_PATH=${VITE_WS_PATH}

RUN pnpm --filter @holotransfer/web build

FROM nginx:1.29-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
