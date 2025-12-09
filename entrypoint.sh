#!/bin/sh
set -e

echo "[entrypoint] starting with SEED_ON_STARTUP=${SEED_ON_STARTUP:-false}"

if [ "${SEED_ON_STARTUP}" = "true" ]; then
  if [ -f ./dist/prisma/seed_master.js ]; then
    echo "[entrypoint] running seed script: dist/prisma/seed_master.js"
    node ./dist/prisma/seed_master.js
  else
    echo "[entrypoint] seed script not found at ./dist/prisma/seed_master.js"
  fi
fi

echo "[entrypoint] starting server"
exec node ./dist/server.js
