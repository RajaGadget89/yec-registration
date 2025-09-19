#!/usr/bin/env bash
# ========================================
# Pre-CI/CD Check Script - Shortcut
# ========================================
# This is a convenient shortcut to the actual script
# located in scripts/internal/cicd/pre-cicd-check.sh
#
# SECURITY: The actual script contains sensitive information
# and is located in scripts/internal/ which is excluded from git
#
# Usage: ./pre-cicd-check.sh [arguments]
# ========================================

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the actual script
ACTUAL_SCRIPT="$SCRIPT_DIR/scripts/internal/cicd/pre-cicd-check.sh"

# Check if the actual script exists
if [ ! -f "$ACTUAL_SCRIPT" ]; then
    echo "❌ Error: Actual script not found at $ACTUAL_SCRIPT"
    echo "💡 Make sure the script is properly located in scripts/internal/cicd/"
    exit 1
fi

# Make sure the actual script is executable
chmod +x "$ACTUAL_SCRIPT" 2>/dev/null || true

# Execute the actual script with all passed arguments
exec "$ACTUAL_SCRIPT" "$@"
