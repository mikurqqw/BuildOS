FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM nginxinc/nginx-unprivileged:stable-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
USER 101
EXPOSE 8080

FROM node:24-alpine AS api
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.11.2 --activate
COPY --from=build --chown=node:node /app /app
USER node
ENV HOST=0.0.0.0
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]

FROM api AS worker
CMD ["node", "apps/worker/dist/index.js"]
