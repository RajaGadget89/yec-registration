#!/usr/bin/env bash
set -euo pipefail

SVC="${1:-web}"              # ชื่อ service (ปรับตามจริง)
COMPOSE="docker-compose.dev.yml"

echo "🔁 Recreating $SVC with updated env..."
docker compose -f "$COMPOSE" up -d --no-deps --force-recreate "$SVC"

echo "🔎 Verifying env in container..."
docker compose -f "$COMPOSE" exec -T "$SVC" sh -lc 'printenv | grep -E "^ADMIN_.*_EMAILS=" || true'

echo "✅ Done."

