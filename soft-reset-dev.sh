#!/usr/bin/env bash
set -euo pipefail

read -p "This will prune Docker caches and reinstall deps. Continue? [y/N] " -r
[[ "${REPLY:-N}" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 0; }

echo "🧹 Docker down..."
docker compose -f docker-compose.dev.yml down --remove-orphans

echo "🧼 Prune unused Docker data (no volumes)..."
docker system prune -af
docker builder prune -f
# ถ้าแน่ใจว่าไม่มี volume สำคัญ dangling: uncomment บรรทัดล่าง
# docker volume prune -f

echo "♻️ Clean temp artifacts..."
rm -rf .next

# ถ้า dev ใช้ node_modules จากโฮสต์:
echo "📦 Reinstalling deps on host..."
rm -rf node_modules
npm install

echo "🏗️ Rebuild & up..."
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
