# ----------------------------
# ETAPA 1: BUILD
# ----------------------------
FROM node:20-slim AS build

# Instalar OpenSSL (necesario para Prisma)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copiamos archivos de configuración primero para aprovechar el caché de Docker
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Instalamos pnpm y las dependencias (incluyendo devDependencies para compilar)
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copiamos el código fuente
COPY . .

# Generamos el cliente de Prisma y compilamos
RUN npx prisma generate
RUN pnpm run build

# Reemplazamos los alias en los archivos compilados
RUN npx tsc-alias -p tsconfig.json

# ----------------------------
# ETAPA 2: PRODUCTION
# ----------------------------
FROM node:20-slim AS production

ENV NODE_ENV=production

# Instalar OpenSSL y curl (necesarios para Prisma y healthchecks)
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copiamos package.json y lockfile
COPY package.json pnpm-lock.yaml ./

# 1. Instalamos SOLO dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# 2. Truco importante: Para correr "prisma generate" en producción, necesitamos la CLI de Prisma.
#    Como instalamos solo "--prod", la CLI no está. La instalamos temporalmente o copiamos el cliente generado.
#    La forma más segura en Render es instalar la CLI como dev dependency suelta aquí:
RUN pnpm add -D prisma@6

# Copiamos los artefactos de la compilación anterior
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

# Generamos el cliente Prisma para el entorno de producción
RUN npx prisma generate

# No usamos EXPOSE (Render ignora esto, usa la variable PORT), pero está bien dejarlo como doc.
EXPOSE 3000

# COMANDO DE INICIO (Sin entrypoint.sh externo)
# Usamos "sh -c" para poder encadenar comandos si quisieras correr migraciones antes.
# Asegúrate de que tu build genera en ./dist/index.js (o cambia index.js por tu archivo principal app.js o server.js)
CMD ["node", "dist/index.js"]