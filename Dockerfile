# ----------------------------
# ETAPA 1: BUILD
# ----------------------------
FROM node:20-slim AS build

# Instalar OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Archivos de configuración
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Instalar dependencias completas (incluyendo TypeScript)
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# 1. Generar cliente Prisma
RUN npx prisma generate

# 2. Compilar la aplicación (src -> dist)
RUN pnpm run build

# 3. [IMPORTANTE] Compilar MANUALMENTE el seeder
# Esto toma tu archivo TS y crea el JS en ./dist/prisma/seed_master.js
# Usamos flags para asegurar que sea compatible con Node
RUN npx tsc prisma/seed_master.ts --outDir dist/prisma --skipLibCheck --module commonjs --target es2020 --esModuleInterop

# 4. Resolver alias
RUN npx tsc-alias -p tsconfig.json

# ----------------------------
# ETAPA 2: PRODUCTION
# ----------------------------
FROM node:20-slim AS production

ENV NODE_ENV=production
ENV SEED_ON_STARTUP=true

# Instalar OpenSSL y curl
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Instalar Prisma CLI para poder regenerar el cliente si es necesario
RUN pnpm add -D prisma@6

# Copiar el código compilado (Ahora SÍ incluye dist/prisma/seed_master.js)
COPY --from=build /usr/src/app/dist ./dist
# Copiamos también la carpeta prisma original (para el schema)
COPY --from=build /usr/src/app/prisma ./prisma

# Copiar script de entrada
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Generar cliente final
RUN npx prisma generate

EXPOSE 3000

ENTRYPOINT ["sh", "./entrypoint.sh"]