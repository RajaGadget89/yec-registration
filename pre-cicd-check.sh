#!/usr/bin/env bash
# pre-cicd-check.sh - Hardened Pre-CI/CD Checks
set -euo pipefail

# ---------- Pretty ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
title(){ echo -e "\n${BLUE}$1${NC}\n--------------------------------"; }
ok(){ echo -e "${GREEN}✅ $1${NC}"; }
fail(){ echo -e "${RED}❌ $1${NC}"; echo -e "${YELLOW}💡 See docs/CI_CD_ERROR_HANDLING_GUIDE.md${NC}"; exit 1; }

# Run a command but don't let `set -e` kill the script before we can pretty-print
run(){
  local msg="$1"; shift
  echo "$msg"
  set +e
  "$@"; local rc=$?
  set -e
  [ $rc -eq 0 ] && ok "$msg" || fail "$msg"
}

echo "🚀 Starting Pre-CI/CD Checks..."
echo "=================================="

# ---------- 0) Runtime guard ----------
title "🧰 Runtime Guard"
REQ_NODE_MAJOR=18
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge "$REQ_NODE_MAJOR" ] || fail "Node $REQ_NODE_MAJOR.x or higher required, found $(node -v)"
ok "Node $(node -v)"

# ---------- 0a) Local .env auto-load (non-CI) ----------
# ถ้ายังไม่มีตัวแปรที่ต้องใช้ และไม่ใช่ CI ให้ลองโหลดจาก .env/.env.local อัตโนมัติ
if [ "${CI:-}" != "true" ]; then
  LOADED_FROM=()
  if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    set -a
    if [ -f .env ]; then . ./.env 2>/dev/null && LOADED_FROM+=(".env"); fi
    if [ -f .env.local ]; then . ./.env.local 2>/dev/null && LOADED_FROM+=(".env.local"); fi
    set +a
    if [ ${#LOADED_FROM[@]} -gt 0 ]; then
      echo "🧩 Loaded env from: ${LOADED_FROM[*]}"
    fi
  fi
fi

# ---------- 1) Change allowlist (optional but recommended) ----------
title "🛡️  Change Allowlist (optional)"
echo "Skip allowlist check for now"; ok "Allowlist skipped"

# ---------- 2) ENV sanity & staging guard ----------
title "🔐 ENV Sanity"
: "${SUPABASE_URL:?Missing SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Missing SUPABASE_SERVICE_ROLE_KEY}"
: "${NEXT_PUBLIC_SUPABASE_URL:?Missing NEXT_PUBLIC_SUPABASE_URL}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?Missing NEXT_PUBLIC_SUPABASE_ANON_KEY}"
: "${CRON_SECRET:?Missing CRON_SECRET}"

ENV_FLAVOR="${SUPABASE_ENV:-staging}"

# Validate database routing - prevent localhost usage in non-localdev environments
if [[ "$ENV_FLAVOR" != "localdev" ]]; then
  if [[ "$SUPABASE_URL" =~ ^(http://)?(127\.0\.0\.1|localhost) ]]; then
    fail "Invalid DB routing: SUPABASE_URL points to localhost while SUPABASE_ENV=$ENV_FLAVOR. Use staging project in Local/CI/Preview. Set SUPABASE_ENV=localdev to explicitly use local database."
  fi
  if [[ "$NEXT_PUBLIC_SUPABASE_URL" =~ ^(http://)?(127\.0\.0\.1|localhost) ]]; then
    fail "Invalid DB routing: NEXT_PUBLIC_SUPABASE_URL points to localhost while SUPABASE_ENV=$ENV_FLAVOR. Use staging project in Local/CI/Preview. Set SUPABASE_ENV=localdev to explicitly use local database."
  fi
fi

if [[ "$ENV_FLAVOR" == "prod" && "${ALLOW_PROD:-0}" != "1" ]]; then
  fail "Refusing to run audit tests against PROD (SUPABASE_ENV=prod). Set SUPABASE_ENV=staging or ALLOW_PROD=1 intentionally."
fi

# Validate EMAIL_FROM in production
if [[ "${NODE_ENV:-}" == "production" ]]; then
  if [[ -z "${EMAIL_FROM:-}" ]]; then
    fail "EMAIL_FROM is required in production environment"
  fi
  echo "EMAIL_FROM validated for production: ${EMAIL_FROM}"
fi

# Extract hostname for logging (masked)
SUPABASE_HOST=$(echo "$SUPABASE_URL" | sed -E 's|^https?://([^/]+).*|\1|')
echo "ENV OK (masked) HOST=$SUPABASE_HOST SRK=${SUPABASE_SERVICE_ROLE_KEY:0:6}**** ENV=$ENV_FLAVOR CRON_SECRET=${CRON_SECRET:0:6}****"

# ---------- 3) Code quality ----------
title "🔍 Code Quality"
run "ESLint (no warnings)" npm run -s lint -- --max-warnings=0
run "TypeScript compile (noEmit)" npx -y tsc --noEmit

# ---------- 4) Security-critical unit(s) ----------
title "🔒 Security-Critical Unit Tests"
if [ -f "app/lib/filenameUtils.test.ts" ]; then
  run "filenameUtils.test.ts" npx -y tsx app/lib/filenameUtils.test.ts
else
  echo "Skip filenameUtils.test.ts (not found)"; ok "Unit test skipped"
fi

# Database routing validation test
run "Database routing validation" npm run -s test:db-routing

# ---------- 5) Build sanity (CI only) ----------
title "🏗️ Build Sanity (CI only)"
if [ "${CI:-}" = "true" ]; then
  run "Next.js build" bash -lc 'NEXT_TELEMETRY_DISABLED=1 npm run -s build'
else
  echo "Skip build (not CI)"; ok "Build skipped"
fi

# ---------- 6) Audit E2E (writes to audit.* on STAGING) ----------
title "🧪 Audit E2E"
run "Playwright @audit suite" npm run -s test:audit

# ---------- 7) Optional full test suite ----------
title "🧪 Full Test Suite (Optional)"
if [ "${RUN_FULL:-0}" = "1" ]; then
  run "npm test (full suite)" npm test
else
  echo "Set RUN_FULL=1 to run full test suite"; ok "Full suite skipped"
fi

echo -e "\n🎉 All Pre-CI/CD Checks Passed!\n=================================="
echo -e "${GREEN}✅ Ready for CI/CD deployment${NC}"

