# ----------------------------
# ETAPA 1: BUILD
# ----------------------------
FROM node:20-slim AS build

# Instalar OpenSSL (necesario para Prisma)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copiamos archivos de configuración
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Instalamos dependencias
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copiamos el código fuente
COPY . .

# 1. Generar cliente Prisma
RUN npx prisma generate

# 2. Compilar la aplicación principal
RUN pnpm run build

# 3. Compilar el Seeder manualmente
# Esto genera el archivo dist/prisma/seed_master.js
RUN npx tsc prisma/seed_master.ts \
    --outDir dist/prisma \
    --skipLibCheck \
    --module commonjs \
    --target es2020 \
    --esModuleInterop \
    --resolveJsonModule

# 4. Resolver alias (si usas path aliases en tu proyecto)
RUN npx tsc-alias -p tsconfig.json || true

# ----------------------------
# ETAPA 2: PRODUCTION
# ----------------------------
FROM node:20-slim AS production

ENV NODE_ENV=production
ENV SEED_ON_STARTUP=true

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

# Instalar dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Instalar Prisma CLI (Necesario para ejecutar db push en el entrypoint)
RUN pnpm add prisma@6.0.0

# --- COPIAS DE ARCHIVOS ---

# 1. Copiar código compilado (JS)
COPY --from=build /usr/src/app/dist ./dist

# 2. Copiar carpeta prisma original (para que lea el schema.prisma)
COPY --from=build /usr/src/app/prisma ./prisma

# 3. [CRÍTICO] Copiar los JSONs a la carpeta dist/prisma
# Esto soluciona el error "Cannot find module './seed_inscriptions.json'"
COPY prisma/*.json ./dist/prisma/

# 4. Copiar y dar permisos al entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Generar cliente final
RUN npx prisma generate

EXPOSE 10000

# Usamos el script externo para manejar la lógica de arranque
ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]