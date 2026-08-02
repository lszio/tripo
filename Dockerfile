FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma:generate && pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    DATABASE_URL=file:/data/travel.db

RUN corepack enable

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma:migrate && pnpm start"]
