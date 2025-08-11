#!/bin/bash

# ตั้งชื่อไฟล์ zip พร้อมวันที่และเวลา
NOW=$(date +"%Y%m%d_%H%M%S")
ZIP_NAME="yec_registration_$NOW.zip"

# ไฟล์และโฟลเดอร์ที่ต้องการ backup
INCLUDE=(
  ".env.backup"
  "package.json"
  "package-lock.json"
  "Dockerfile"
  "Dockerfile.dev"
  "docker-compose.yml"
  "docker-compose.dev.yml"
  "next.config.js"
  "public"
  "pages"
  "app"
  "src"
  ".gitignore"
  ".dockerignore"
  ".cursorignore"
  "reset-dev.sh"
  ".cursor"
  ".env.local"
  ".github"
  "backup.sh"
  "docs"
  "documents"
  "env.template"
  "eslint.config.mjs"
  "fonts"
  "memory-bank"
  "middleware.ts"
  "next-env.d.ts"
  "package-lock.backup.json"
  "playwright.config.ts"
  "postcss.config.mjs"
  "reset-dev.sh"
  "tailwind.config.ts"
  "tsconfig.json"
  "tsconfig.tsbuildinfo"
  ".vercelignore"
  ".git"
)

# สร้าง zip file
echo "📦 Creating backup: $ZIP_NAME"
zip -r "$ZIP_NAME" "${INCLUDE[@]}" > /dev/null

echo "✅ Backup complete → $ZIP_NAME"

