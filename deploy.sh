#!/usr/bin/env sh
set -eu

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

docker compose build
docker compose up -d
docker compose ps

if [ "${TEST_HEALTH:-0}" = "1" ]; then
  port="${QTPI_QTBLOCKS_PORT:-8080}"
  curl --fail --silent --show-error "http://127.0.0.1:${port}/health"
fi
