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

# Debug: list dist files to ensure expected entry exists
echo "[entrypoint] dist contents:" 
ls -la dist || true

# Prefer starting the compiled index.js which runs the app and handles DB connect
if [ -f ./dist/index.js ]; then
  exec node ./dist/index.js
elif [ -f ./dist/server.js ]; then
  exec node ./dist/server.js
else
  echo "[entrypoint] ERROR: no dist entrypoint found (dist/index.js or dist/server.js)"
  ls -la ./dist || true
  exit 1
fi
