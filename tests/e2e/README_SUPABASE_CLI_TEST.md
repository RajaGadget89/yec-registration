 # Supabase CLI Connection Test

This test validates the Supabase CLI connection functionality that's used in CI/CD workflows.

## ⚠️ Security Notice

**IMPORTANT:** This test requires real Supabase credentials. Never commit actual credentials to the repository.

## Required Environment Variables

Before running this test, you must set the following environment variables:

```bash
# Your Supabase access token (starts with sbp_)
SUPABASE_ACCESS_TOKEN=sbp_your_access_token_here

# Your Supabase project reference ID
SUPABASE_PROJECT_REF=your_project_reference_here

# Your database password
SUPABASE_DB_PASSWORD=your_database_password_here
```

## How to Get Credentials

1. **Supabase Access Token:**
   - Go to https://supabase.com/dashboard/account/tokens
   - Create a new access token
   - Copy the token (starts with `sbp_`)

2. **Project Reference:**
   - Go to your Supabase project dashboard
   - The project reference is in the URL: `https://supabase.com/dashboard/project/[project-ref]`
   - Or find it in Project Settings > API

3. **Database Password:**
   - Go to your Supabase project dashboard
   - Navigate to Settings > Database
   - Find the database password

## Running the Test

### Option 1: Export environment variables
```bash
export SUPABASE_ACCESS_TOKEN=sbp_your_token
export SUPABASE_PROJECT_REF=your_project_ref
export SUPABASE_DB_PASSWORD=your_password

npm test tests/e2e/supabase-cli-connection.e2e.spec.ts
```

### Option 2: Use .env file
```bash
# Copy env.template to .env.local and fill in your values
cp env.template .env.local

# Edit .env.local with your actual credentials
# Then run the test
npm test tests/e2e/supabase-cli-connection.e2e.spec.ts
```

### Option 3: Inline environment variables
```bash
SUPABASE_ACCESS_TOKEN=sbp_your_token SUPABASE_PROJECT_REF=your_project_ref SUPABASE_DB_PASSWORD=your_password npm test tests/e2e/supabase-cli-connection.e2e.spec.ts
```

## What the Test Does

1. **CLI Version Check:** Verifies Supabase CLI is installed and working
2. **Project Linking:** Tests linking to your Supabase project
3. **Database Ping:** Tests the `supabase db ping` command
4. **Database Diff:** Tests the `supabase db diff` command
5. **Database Query:** Tests direct SQL execution
6. **Migration Repair:** Tests the `supabase migration repair` command

## Troubleshooting

### Missing Environment Variables
If you see an error about missing environment variables, make sure you've set all three required variables.

### Authentication Errors
- Verify your access token is valid and not expired
- Ensure you have the correct project reference
- Check that your database password is correct

### Connection Issues
- Verify your Supabase project is active
- Check if there are any network restrictions
- Ensure the Supabase CLI is properly installed

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate access tokens** regularly
4. **Use least privilege** - only grant necessary permissions
5. **Monitor access** to your Supabase project

## CI/CD Integration

In CI/CD environments, these environment variables should be set as secrets:

```yaml
# GitHub Actions example
env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```
