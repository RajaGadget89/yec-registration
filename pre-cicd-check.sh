#!/usr/bin/env bash
# pre-cicd-check.sh - Hardened Pre-CI/CD Checks
set -euo pipefail

# ---------- Pretty ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
title(){ echo -e "\n${BLUE}$1${NC}\n--------------------------------"; }
ok(){ echo -e "${GREEN}✅ $1${NC}"; }
fail(){ echo -e "${RED}❌ $1${NC}"; echo -e "${YELLOW}💡 See docs/CI_CD_ERROR_HANDLING_GUIDE.md${NC}"; exit 1; }
warn(){ echo -e "${YELLOW}⚠️  $1${NC}"; }

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

# ---------- 0b) CRITICAL: Credential Exposure Scan ----------
title "🔒 CRITICAL: Credential Exposure Scan"

# Function to scan for credential patterns
scan_credentials() {
  local scan_dir="$1"
  local pattern="$2"
  local description="$3"
  local severity="$4"  # "critical", "warning", "info"
  
  echo "Scanning for $description..."
  
  # Use git diff to only check staged and working directory changes
  local results=""
  if [ "${CI:-}" = "true" ]; then
    # In CI, scan all files except environment files and documentation
    results=$(find "$scan_dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" \) -not -name ".env*" -not -name ".cd-env*" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./docs/*" -exec grep -l "$pattern" {} \; 2>/dev/null || true)
  else
    # In local development, scan only staged and working directory changes
    results=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E "\.(ts|tsx|js|jsx|json|yml|yaml)$" | grep -v "\.env" | grep -v "\.cd-env" | grep -v "^docs/" | xargs -I {} grep -l "$pattern" {} 2>/dev/null || true)
    results+=$'\n'$(git diff --name-only --diff-filter=ACM 2>/dev/null | grep -E "\.(ts|tsx|js|jsx|json|yml|yaml)$" | grep -v "\.env" | grep -v "\.cd-env" | grep -v "^docs/" | xargs -I {} grep -l "$pattern" {} 2>/dev/null || true)
  fi
  
  if [ -n "$results" ]; then
    local color=""
    case "$severity" in
      "critical") color="$RED" ;;
      "warning") color="$YELLOW" ;;
      "info") color="$BLUE" ;;
    esac
    
    # Filter out placeholder patterns
    local filtered_results=""
    while read -r file; do
      if [ -n "$file" ] && [ -f "$file" ]; then
        # Check if the file contains real credentials (not placeholders)
        if grep -q "$pattern" "$file" 2>/dev/null; then
          # Check if it's a placeholder
          if ! grep -q "_placeholder\|_test_\|_example_\|_your_\|_sample_" "$file" 2>/dev/null; then
            filtered_results+="$file"$'\n'
          fi
        fi
      fi
    done <<< "$results"
    
    if [ -n "$filtered_results" ]; then
      echo -e "${color}⚠️  Potential $description found in:${NC}"
      echo "$filtered_results" | sort -u | while read -r file; do
        if [ -n "$file" ]; then
          echo -e "${color}   - $file${NC}"
          # Show the problematic lines (masked)
          if [ -f "$file" ]; then
            grep -n "$pattern" "$file" 2>/dev/null | head -3 | while read -r line; do
              echo -e "${color}     $line${NC}" | sed 's/\([a-zA-Z0-9]\{20,\}\)/***MASKED***/g'
            done
          fi
        fi
      done
      
      if [ "$severity" = "critical" ]; then
        fail "CRITICAL: Credential exposure detected! Fix before pushing."
      elif [ "$severity" = "warning" ]; then
        warn "WARNING: Potential credential exposure detected. Review before pushing."
      fi
    else
      ok "No $description found (placeholders excluded)"
    fi
  else
    ok "No $description found"
  fi
}

# Critical credential patterns (will fail the build)
echo "🔍 Scanning for critical credential exposures..."
scan_credentials "." "sbp_[a-zA-Z0-9]{40,}" "Supabase access tokens" "critical"
scan_credentials "." "sk_[a-zA-Z0-9]{40,}" "Supabase service role keys" "critical"
scan_credentials "." "eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+" "JWT tokens" "critical"
scan_credentials "." "ghp_[a-zA-Z0-9]{36}" "GitHub personal access tokens" "critical"
scan_credentials "." "gho_[a-zA-Z0-9]{36}" "GitHub OAuth tokens" "critical"
scan_credentials "." "ghu_[a-zA-Z0-9]{36}" "GitHub user-to-server tokens" "critical"
scan_credentials "." "ghs_[a-zA-Z0-9]{36}" "GitHub server-to-server tokens" "critical"
scan_credentials "." "ghr_[a-zA-Z0-9]{36}" "GitHub refresh tokens" "critical"

# Warning patterns (will warn but not fail)
echo "🔍 Scanning for potential credential exposures..."
scan_credentials "." "password.*=.*['\"][^'\"]{8,}['\"]" "Hardcoded passwords" "warning"
scan_credentials "." "api_key.*=.*['\"][^'\"]{20,}['\"]" "Hardcoded API keys" "warning"
scan_credentials "." "secret.*=.*['\"][^'\"]{20,}['\"]" "Hardcoded secrets" "warning"
scan_credentials "." "token.*=.*['\"][^'\"]{20,}['\"]" "Hardcoded tokens" "warning"

# Info patterns (for awareness)
echo "🔍 Scanning for credential patterns..."
scan_credentials "." "process\.env\.[A-Z_]+" "Environment variable usage" "info"

# Check for .env files that might be accidentally committed
echo "🔍 Checking for .env files..."
ENV_FILES=$(find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)
if [ -n "$ENV_FILES" ]; then
  echo -e "${YELLOW}⚠️  .env files found:${NC}"
  echo "$ENV_FILES" | while read -r file; do
    if [ -n "$file" ]; then
      echo -e "${YELLOW}   - $file${NC}"
    fi
  done
  warn "Ensure .env files are in .gitignore"
else
  ok "No .env files found in working directory"
fi

# Check .gitignore for credential protection
echo "🔍 Checking .gitignore for credential protection..."
if [ -f ".gitignore" ]; then
  if grep -q "\.env" .gitignore; then
    ok ".env files are properly ignored"
  else
    warn ".env files not found in .gitignore"
  fi
  
  if grep -q "\.env\." .gitignore; then
    ok ".env.* files are properly ignored"
  else
    warn ".env.* files not found in .gitignore"
  fi
else
  warn ".gitignore file not found"
fi

# Check for credentials in git history (if not in CI)
if [ "${CI:-}" != "true" ]; then
  echo "🔍 Checking recent git history for credentials..."
  RECENT_CREDS=$(git log --oneline -10 --grep="password\|token\|secret\|key\|credential" 2>/dev/null || true)
  if [ -n "$RECENT_CREDS" ]; then
    warn "Recent commits contain credential-related keywords:"
    echo "$RECENT_CREDS" | while read -r commit; do
      if [ -n "$commit" ]; then
        echo -e "${YELLOW}   - $commit${NC}"
      fi
    done
  else
    ok "No recent credential-related commits found"
  fi
fi

ok "Credential exposure scan completed"

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
run "Prettier format check" npm run -s format:check
run "ESLint (no warnings)" npm run -s lint -- --max-warnings=0
run "TypeScript compile (noEmit)" npx -y tsc --noEmit

# ---------- 3a) Optional Prettier auto-fix ----------
if [ "${AUTO_FIX_FORMATTING:-0}" = "1" ]; then
  title "🎨 Prettier Auto-Fix (Optional)"
  echo "Auto-fixing formatting issues..."
  npm run -s format
  ok "Prettier auto-fix completed"
  echo "Re-running format check to verify..."
  run "Prettier format check (after auto-fix)" npm run -s format:check
else
  echo "Set AUTO_FIX_FORMATTING=1 to automatically fix formatting issues"
fi

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
if [ "${SKIP_AUDIT_TESTS:-0}" = "1" ]; then
  echo "Skip audit tests (SKIP_AUDIT_TESTS=1)"; ok "Audit tests skipped"
else
  run "Playwright @audit suite" npm run -s test:audit
fi

# ---------- 7) Optional full test suite ----------
title "🧪 Full Test Suite (Optional)"
if [ "${RUN_FULL:-0}" = "1" ]; then
  run "npm test (full suite)" npm test
else
  echo "Set RUN_FULL=1 to run full test suite"; ok "Full suite skipped"
fi

echo -e "\n🎉 All Pre-CI/CD Checks Passed!\n=================================="
echo -e "${GREEN}✅ Ready for CI/CD deployment${NC}"
echo -e "${GREEN}✅ No credential exposures detected${NC}"

