#!/bin/bash

# Magic Link Authentication Fix - Deployment Script
# Date: 2025-01-27
# Description: Deploy the traditional database migration solution for Magic Link authentication

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/scripts/sql/fixes/fix-magic-link-auth-traditional.sql"
ROLLBACK_FILE="$SCRIPT_DIR/scripts/sql/rollbacks/rollback-magic-link-auth.sql"
TEST_FILE="$SCRIPT_DIR/test-magic-link-auth-comprehensive.js"
BACKUP_DIR="$SCRIPT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if SQL file exists
    if [ ! -f "$SQL_FILE" ]; then
        log_error "SQL file not found: $SQL_FILE"
        exit 1
    fi
    
    # Check if test file exists
    if [ ! -f "$TEST_FILE" ]; then
        log_error "Test file not found: $TEST_FILE"
        exit 1
    fi
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        log_error ".env.local file not found"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        log_warning "Supabase CLI not found. Will use direct database connection."
    fi
    
    log_success "Prerequisites check completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current admin_users table
    log "Backing up admin_users table..."
    
    # Try to use supabase CLI first
    if command -v supabase &> /dev/null; then
        supabase db dump --data-only --table admin_users > "$BACKUP_DIR/admin_users_backup.sql" 2>/dev/null || {
            log_warning "Supabase CLI backup failed, will use alternative method"
        }
    fi
    
    # Create backup info file
    cat > "$BACKUP_DIR/backup_info.txt" << EOF
Magic Link Authentication Fix Backup
Date: $(date)
Script: $0
SQL File: $SQL_FILE
Rollback File: $ROLLBACK_FILE
Environment: $(grep SUPABASE_ENV .env.local | cut -d'=' -f2 || echo 'unknown')
EOF
    
    log_success "Backup created in: $BACKUP_DIR"
}

# Run pre-deployment tests
run_pre_tests() {
    log "Running pre-deployment tests..."
    
    # Run comprehensive test
    if node "$TEST_FILE"; then
        log_success "Pre-deployment tests passed"
        return 0
    else
        log_error "Pre-deployment tests failed"
        return 1
    fi
}

# Deploy the fix
deploy_fix() {
    log "Deploying Magic Link authentication fix..."
    
    # Check if we should use supabase CLI or direct connection
    if command -v supabase &> /dev/null; then
        log "Using Supabase CLI for deployment..."
        
        # Apply the SQL migration
        if supabase db reset --linked --debug; then
            log_success "Database reset completed"
        else
            log_error "Database reset failed"
            return 1
        fi
        
        # Apply the fix
        if supabase db push --linked; then
            log_success "Database migration applied"
        else
            log_error "Database migration failed"
            return 1
        fi
    else
        log_warning "Supabase CLI not available. Manual deployment required."
        log "Please run the following SQL script manually:"
        log "  $SQL_FILE"
        log ""
        log "Or use your preferred database client to execute the SQL."
        return 1
    fi
}

# Run post-deployment tests
run_post_tests() {
    log "Running post-deployment tests..."
    
    # Wait a moment for changes to propagate
    sleep 2
    
    # Run comprehensive test again
    if node "$TEST_FILE"; then
        log_success "Post-deployment tests passed"
        return 0
    else
        log_error "Post-deployment tests failed"
        return 1
    fi
}

# Main deployment function
main() {
    log "Starting Magic Link Authentication Fix Deployment"
    log "=================================================="
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Create backup
    create_backup
    
    # Step 3: Run pre-deployment tests
    if ! run_pre_tests; then
        log_error "Pre-deployment tests failed. Aborting deployment."
        exit 1
    fi
    
    # Step 4: Deploy the fix
    if ! deploy_fix; then
        log_error "Deployment failed. Check the logs above."
        log "You can rollback using: $ROLLBACK_FILE"
        exit 1
    fi
    
    # Step 5: Run post-deployment tests
    if ! run_post_tests; then
        log_error "Post-deployment tests failed. Consider rolling back."
        log "Rollback script: $ROLLBACK_FILE"
        exit 1
    fi
    
    # Success!
    log_success "Magic Link Authentication Fix deployed successfully!"
    log ""
    log "Next steps:"
    log "1. Test Magic Link authentication manually"
    log "2. Verify admin management functionality"
    log "3. Check AC1-AC6 workflow compatibility"
    log ""
    log "Backup location: $BACKUP_DIR"
    log "Rollback script: $ROLLBACK_FILE"
    log "Test results: artifacts/test-results/magic-link-auth-test-results.json"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Magic Link Authentication Fix Deployment Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --test-only    Run tests only, don't deploy"
        echo "  --rollback     Rollback the fix"
        echo ""
        echo "Files:"
        echo "  $SQL_FILE      - Main SQL migration script"
        echo "  $ROLLBACK_FILE - Rollback script"
        echo "  $TEST_FILE     - Comprehensive test suite"
        exit 0
        ;;
    --test-only)
        log "Running tests only..."
        check_prerequisites
        run_pre_tests
        exit $?
        ;;
    --rollback)
        log "Rolling back Magic Link authentication fix..."
        if [ -f "$ROLLBACK_FILE" ]; then
            log "Please run the rollback SQL script manually:"
            log "  $ROLLBACK_FILE"
        else
            log_error "Rollback file not found: $ROLLBACK_FILE"
            exit 1
        fi
        exit 0
        ;;
    *)
        main
        ;;
esac
