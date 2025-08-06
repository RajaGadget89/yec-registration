#!/bin/bash

echo "🧹 Cleaning up Docker environment..."
docker compose -f docker-compose.dev.yml down --remove-orphans
docker system prune -af
docker volume prune -f
docker builder prune -f

echo "♻️ Removing temp files..."
rm -rf .next node_modules

echo "🔁 Reinstalling dependencies..."
npm install

echo "🚀 Rebuilding containers..."
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d

echo "✅ Dev environment has been reset and restarted successfully."
