FROM node:20-slim AS build
RUN apt-get update && apt-get install -y postgresql-client curl openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
RUN npm install -g pnpm
RUN pnpm add -D prisma@6 tsc-alias
RUN pnpm install
COPY . .
RUN npx prisma generate
RUN pnpm run build
RUN npx tsc-alias -p tsconfig.json

FROM node:20-slim AS production
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y postgresql-client curl openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --only=production --frozen-lockfile
RUN pnpm add prisma@6
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/server.js"]