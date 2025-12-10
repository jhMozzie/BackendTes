#!/bin/sh
set -e

echo "[entrypoint] 🚀 Starting container..."

# 1. CREACIÓN DE TABLAS (db push)
# Esto reemplaza a las migraciones. Crea las tablas si no existen.
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] 🏗️  Pushing database structure (creating tables)..."
  # --accept-data-loss permite cambios destructivos si el schema cambia (útil en dev/test)
  npx prisma db push --accept-data-loss
else
  echo "[entrypoint] ⚠️  DATABASE_URL not set, skipping DB push."
fi

# 2. EJECUCIÓN DEL SEEDER
echo "[entrypoint] Checking SEED_ON_STARTUP=${SEED_ON_STARTUP:-false}"

if [ "${SEED_ON_STARTUP}" = "true" ]; then
  if [ -f ./dist/prisma/seed_master.js ]; then
    echo "[entrypoint] 🌱 Determining whether DB needs seeding..."

    # Node one-liner: prints 'true' if we should seed (i.e. no roles found), 'false' otherwise.
    SHOULD_SEED=$(node -e "(async ()=>{ try{ const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); const c=await p.role.count(); await p.$disconnect(); console.log(c===0?'true':'false'); }catch(e){ console.error('SEED_CHECK_ERROR', e && e.message); console.log('true'); } })()" 2>/dev/null || echo "true")

    echo "[entrypoint] should_seed=$SHOULD_SEED"

    if [ "$SHOULD_SEED" = "true" ]; then
      echo "[entrypoint] 🌱 Running seed script: dist/prisma/seed_master.js"
      node ./dist/prisma/seed_master.js
    else
      echo "[entrypoint] ℹ️  Database appears seeded; skipping seeder."
    fi
  else
    echo "[entrypoint] ❌ seed script not found at ./dist/prisma/seed_master.js"
    echo "[entrypoint] Debug - listing dist/prisma:"
    ls -la dist/prisma || true
  fi
fi

# 3. INICIO DEL SERVIDOR
echo "[entrypoint] ✨ Starting server..."

# Prefer starting the compiled index.js
if [ -f ./dist/index.js ]; then
  exec node ./dist/index.js
elif [ -f ./dist/server.js ]; then
  exec node ./dist/server.js
else
  echo "[entrypoint] ❌ ERROR: no dist entrypoint found (dist/index.js or dist/server.js)"
  ls -la ./dist || true
  exit 1
fi

