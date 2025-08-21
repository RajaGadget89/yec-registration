# CD Simulation Testing with Playwright

## Overview

This directory contains a comprehensive CD (Continuous Deployment) simulation system that replicates the exact GitHub Actions environment and workflow using Playwright E2E testing capabilities.

## 🎯 Purpose

The CD simulation allows you to:
- **Test CD workflows locally** before deploying to production
- **Catch issues early** that would cause CD failures
- **Validate timeout and resource constraints** in a controlled environment
- **Debug CD-specific problems** with detailed logging and artifacts
- **Ensure consistency** between local testing and CD execution

## 🏗️ Architecture

### Files Structure
```
tests/e2e/
├── cd-simulation-comprehensive.spec.ts    # Main CD simulation test
├── cd-simulation-setup.ts                 # CD environment setup
├── cd-simulation-teardown.ts              # CD environment cleanup
└── README_CD_SIMULATION.md               # This documentation

playwright.cd-simulation.config.ts         # CD-specific Playwright config
.cd-env.template                          # Environment variables template
```

### CD Simulation Components

1. **Environment Replication**: Mirrors GitHub Actions Ubuntu environment
2. **Tool Installation**: Simulates Supabase CLI setup
3. **File Operations**: Replicates checkout and sync operations
4. **Database Operations**: Tests link, diff, repair, and push commands
5. **Timeout Simulation**: Applies the same timeout constraints as CD
6. **Artifact Generation**: Creates the same outputs as CD
7. **Error Handling**: Tests the same fallback mechanisms

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Copy the template and configure your environment
cp .cd-env.template .cd-env

# Edit .cd-env with your staging credentials
nano .cd-env
```

### 2. Run CD Simulation
```bash
# Run the complete CD simulation
npm run e2e:cd-simulation

# Run with headed browser (for debugging)
npm run e2e:cd-simulation:headed

# Run in debug mode
npm run e2e:cd-simulation:debug
```

## 📋 CD Simulation Steps

The simulation replicates these exact CD steps:

### Step 1: Environment Validation
- Validates required environment variables
- Checks Supabase CLI availability
- Ensures proper configuration

### Step 2: Supabase CLI Setup
- Installs/verifies Supabase CLI version
- Matches CD tool installation process

### Step 3: Project Linking
- Links to Supabase project using credentials
- Tests connection and authentication

### Step 4: Migration Sync
- Syncs migrations from `migrations/` to `supabase/migrations/`
- Replicates CD file operations

### Step 5: Auto-Repair remote_schema
- Tests the auto-repair functionality
- Validates timeout and fallback mechanisms
- Simulates the exact CD repair process

### Step 6: Migration Diff Generation
- Generates migration differences
- Saves diff artifacts for debugging
- Tests diff command execution

### Step 7: Dry Run Migration
- Performs migration dry-run
- Validates migration safety
- Tests dry-run command execution

### Step 8: Apply Migrations
- Applies migrations to database
- Tests actual migration process
- Validates migration success

## 🔧 Configuration

### Environment Variables

Required variables in `.cd-env`:
```bash
# Supabase Configuration
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
SUPABASE_ACCESS_TOKEN=sbp_your_access_token_here
SUPABASE_PROJECT_REF=your_staging_project_ref
SUPABASE_DB_PASSWORD=your_staging_database_password

# CD-specific variables
SUPABASE_NON_INTERACTIVE=1
SUPABASE_CLI_VERSION=latest
```

### Timeout Configuration

The simulation uses the same timeouts as CD:
- **Step timeout**: 30 seconds (configurable)
- **Auto-repair timeout**: 60 seconds
- **Fallback cleanup timeout**: 30 seconds
- **Migration timeout**: 60 seconds

## 📊 Artifacts and Reporting

### Generated Artifacts
- **CD simulation report**: `cd-simulation-report.json`
- **Migration diff**: `migration_diff.txt`
- **Step logs**: Detailed console output
- **Screenshots**: On failure (if headed mode)

### Report Structure
```json
{
  "timestamp": "2025-01-27T12:00:00.000Z",
  "environment": {
    "nodeVersion": "v18.x.x",
    "platform": "darwin",
    "arch": "x64"
  },
  "steps": [
    {
      "step": "Setup Supabase CLI",
      "success": true,
      "output": "...",
      "error": "",
      "exitCode": 0,
      "duration": 1234
    }
  ],
  "summary": {
    "totalSteps": 8,
    "successfulSteps": 7,
    "failedSteps": 1,
    "totalDuration": 45678
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```bash
   # Check your .cd-env file
   cat .cd-env
   
   # Ensure all required variables are set
   source .cd-env
   ```

2. **Supabase CLI Not Found**
   ```bash
   # Install Supabase CLI
   npm install -g supabase@latest
   
   # Verify installation
   supabase --version
   ```

3. **Connection Failures**
   ```bash
   # Test connection manually
   supabase link --project-ref YOUR_REF --password YOUR_PASSWORD
   
   # Check credentials
   echo $SUPABASE_ACCESS_TOKEN
   ```

4. **Timeout Issues**
   ```bash
   # Increase timeout in .cd-env
   CD_SIMULATION_TIMEOUT=600000
   ```

### Debug Mode

Run in debug mode for detailed investigation:
```bash
npm run e2e:cd-simulation:debug
```

This will:
- Run with headed browser
- Provide interactive debugging
- Show detailed step-by-step execution
- Allow manual intervention

## 🔄 Integration with CI/CD

### Pre-CD Validation

Run CD simulation before deploying:
```bash
# In your CI pipeline
npm run e2e:cd-simulation
```

### Automated Testing

Add to your test suite:
```bash
# Run all tests including CD simulation
npm run test:all
```

## 📈 Benefits

### Early Issue Detection
- Catch CD-specific problems before production
- Validate timeout and resource constraints
- Test error handling and fallbacks

### Consistent Testing
- Same environment as CD
- Same commands and processes
- Same timeout and resource limits

### Detailed Debugging
- Comprehensive logging
- Artifact generation
- Step-by-step execution tracking

### Cost Reduction
- Test locally instead of in CD
- Faster feedback loop
- Reduced CD failures

## 🚨 Safety Features

### Staging Environment
- Uses staging database for safety
- No production data modification
- Safe testing environment

### Dry Run Mode
- Tests migration safety
- Validates changes before application
- Prevents accidental modifications

### Timeout Protection
- Prevents hanging operations
- Matches CD timeout constraints
- Graceful failure handling

## 📝 Best Practices

1. **Always use staging credentials** for CD simulation
2. **Run simulation before CD deployment** to catch issues early
3. **Review artifacts** after each simulation run
4. **Update timeouts** if your environment is slower
5. **Keep .cd-env secure** and never commit credentials
6. **Run in debug mode** for complex issues

## 🔗 Related Documentation

- [GitHub Actions Workflow](../.github/workflows/db-production-migration.yml)
- [E2E Testing Guide](./README.md)
- [Supabase CLI Testing](./README_SUPABASE_CLI_TEST.md)
- [Session Tracking System](../../docs/SESSION_TRACKING_SYSTEM.md)
