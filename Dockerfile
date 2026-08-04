FROM oven/bun:1.2.6-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx prisma generate && bun run build

FROM oven/bun:1.2.6-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    DATABASE_URL=file:/data/travel.db

COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3000

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]
