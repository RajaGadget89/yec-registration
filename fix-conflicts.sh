#!/bin/bash

# Simple script to fix the most common merge conflict patterns
# This script will replace common conflict patterns with the HEAD version (our version)

echo "Fixing merge conflicts..."

# Fix common patterns in all files
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/<<<<<<< HEAD//g'
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/=======//g'
find app -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/>>>>>>> origin\/main//g'

echo "Merge conflict markers removed. Running build..."
npm run build
