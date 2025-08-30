#!/bin/bash

# Run AC1-AC6 Registration E2E Tests
# This script runs the Registration vertical slice tests sequentially

set -e

export PLAYWRIGHT_BASE_URL=http://localhost:8080
export TEST_HELPERS_ENABLED=1

echo "🚀 Starting AC1-AC6 Registration E2E Tests"
echo "=========================================="

# Create artifacts directory
mkdir -p artifacts/e2e/AC

# AC1 — Submit → waiting_for_review
echo "📋 Running AC1 — Submit → waiting_for_review"
npx playwright test tests/e2e/registration-ac1-submit.e2e.spec.ts --workers=1 --reporter=line,junit,html --output=artifacts/e2e/AC/AC1

# AC2 — Admin Request Update (per dimension)
echo "📋 Running AC2 — Admin Request Update (per dimension)"
npx playwright test tests/e2e/registration-ac2-request-update.e2e.spec.ts --workers=1 --reporter=line,junit,html --output=artifacts/e2e/AC/AC2

# AC3 — Deep-link Resubmit
echo "📋 Running AC3 — Deep-link Resubmit"
npx playwright test tests/e2e/registration-ac3-deeplink-resubmit.e2e.spec.ts --workers=1 --reporter=line,junit,html --output=artifacts/e2e/AC/AC3

# AC4 — Mark PASS (RBAC)
echo "📋 Running AC4 — Mark PASS (RBAC)"
npx playwright test tests/e2e/registration-ac4-mark-pass.e2e.spec.ts --workers=1 --reporter=line,junit,html --output=artifacts/e2e/AC/AC4

# AC5 — Approve when all 3 PASS
echo "📋 Running AC5 — Approve when all 3 PASS"
npx playwright test tests/e2e/registration-ac5-approve.e2e.spec.ts --workers=1 --reporter=line,junit,html --output=artifacts/e2e/AC/AC5

# AC6 — File Validation (TH/EN)
echo "📋 Running AC6 — File Validation (TH/EN)"
npx playwright test tests/e2e/registration-ac6-file-validation.e2e.spec.ts --workers=1 --reporter=line,junit,html --output=artifacts/e2e/AC/AC6

echo "✅ All AC tests completed!"
echo "📁 Artifacts saved to artifacts/e2e/AC/"
