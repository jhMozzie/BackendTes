# ----------------------------
# ETAPA 1: BUILD
# ----------------------------
FROM node:20-slim AS build

# Instalar OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copiamos archivos de configuración para aprovechar caché de Docker
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY tsconfig.seeds.json ./

# Instalamos pnpm y todas las dependencias (incluye dev)
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copiamos el código fuente
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Compilar la aplicación principal
RUN pnpm run build

# Compilar los seeds TS a JS en dist/prisma
RUN npx tsc -p tsconfig.seeds.json

# CRÍTICO: Copiar TODOS los archivos JSON de prisma/ a dist/prisma/
RUN mkdir -p dist/prisma
RUN cp -v prisma/*.json dist/prisma/ 2>/dev/null || echo "No JSON files found in prisma/"

# Resolver alias si usas tsc-alias
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

# Copiamos package.json y lockfile
COPY package.json pnpm-lock.yaml ./

# Instalamos SOLO dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Instalamos Prisma CLI para poder ejecutar migraciones
RUN pnpm add prisma@6.0.0

# Copiamos artefactos compilados desde build
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

# Generar cliente Prisma en producción
RUN npx prisma generate

# Verificar que los archivos de seed existen (para debugging)
RUN echo "=== Checking seed files ===" && \
    ls -la dist/prisma/ || echo "dist/prisma directory not found"

EXPOSE 10000

# Comando de inicio simplificado
CMD ["sh", "-c", "\
echo '🚀 Starting application...'; \
if [ \"$SEED_ON_STARTUP\" = \"true\" ]; then \
  if [ -n \"$DATABASE_URL\" ] && [ -f ./node_modules/.bin/prisma ]; then \
    echo '📦 Running database migrations...'; \
    attempt=0; max_attempts=12; \
    until ./node_modules/.bin/prisma migrate deploy; do \
      attempt=$((attempt+1)); \
      echo \"⚠️  Migration attempt $attempt/$max_attempts failed. Retrying in 5s...\"; \
      if [ $attempt -ge $max_attempts ]; then \
        echo '⚠️  Max retries reached. Continuing without migrations.'; \
        break; \
      fi; \
      sleep 5; \
    done; \
  else \
    echo '⚠️  Skipping migrations (DATABASE_URL not set or prisma not found)'; \
  fi; \
  if [ -f ./dist/prisma/seed_master.js ]; then \
    echo '🌱 Running seed script...'; \
    node ./dist/prisma/seed_master.js || echo '⚠️  Seed script failed (continuing)'; \
  else \
    echo 'ℹ️  No seed script found at ./dist/prisma/seed_master.js'; \
  fi; \
else \
  echo 'ℹ️  SEED_ON_STARTUP is disabled'; \
fi; \
echo '✨ Starting server...'; \
exec node ./dist/index.js"]