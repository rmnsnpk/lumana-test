# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY libs ./libs
COPY apps ./apps
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
ARG APP
ENV NODE_ENV=production \
    APP=${APP}
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY proto ./proto
RUN mkdir -p /data && chown node:node /data
USER node
CMD ["sh", "-c", "exec node --enable-source-maps dist/apps/${APP}/main.js"]
