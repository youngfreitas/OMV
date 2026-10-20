FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
