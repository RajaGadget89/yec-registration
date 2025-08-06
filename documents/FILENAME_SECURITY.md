# Filename Security Improvements

## Overview

The YEC Registration system has been enhanced with robust filename sanitization and security measures to prevent file upload vulnerabilities and ensure safe, unique filenames.

## Security Issues Addressed

### ❌ **Previous Vulnerabilities**

1. **Unsafe Characters**: Original filenames could contain `<>:"|?*\` characters
2. **Path Traversal**: Filenames like `../../../etc/passwd` could be uploaded
3. **Filename Collisions**: Same timestamp + same name could cause conflicts
4. **Unicode Issues**: Non-ASCII characters could cause encoding problems
5. **Space Handling**: Spaces in filenames could break URLs and parsing

### ✅ **Security Improvements**

1. **Character Sanitization**: All unsafe characters replaced with underscores
2. **Path Traversal Prevention**: Directory traversal attempts blocked
3. **Unique Filenames**: Timestamp + UUID ensures uniqueness
4. **Length Limits**: Filenames truncated to prevent overflow
5. **Extension Validation**: Proper file extensions enforced

## Implementation Details

### 1. **Filename Utilities** (`app/lib/filenameUtils.ts`)

#### `sanitizeFilename(filename: string): string`
- Replaces spaces with underscores
- Removes unsafe characters: `<>:"|?*\`
- Converts to lowercase for consistency
- Limits length to 50 characters
- Preserves file extensions

#### `generateUniqueFilename(originalFilename?: string, prefix?: string): string`
- Creates timestamp-based unique identifiers
- Adds UUID suffix for collision prevention
- Supports optional prefixes for organization
- Sanitizes original filename before use

#### `validateFilename(filename: string): { isValid: boolean; error?: string }`
- Checks for unsafe characters
- Validates filename length (max 255 chars)
- Prevents path traversal attempts
- Returns detailed error messages

#### `ensureFileExtension(filename: string, expectedExtension: string): string`
- Ensures proper file extensions
- Case-insensitive extension checking
- Adds missing extensions automatically

### 2. **Updated Upload Services**

#### `uploadFileToSupabase.ts`
```typescript
// Before (UNSAFE)
const finalFilename = filename || `${Date.now()}-${file.name}`;

// After (SECURE)
let finalFilename: string;
if (filename) {
  const validation = validateFilename(filename);
  if (!validation.isValid) {
    throw new Error(`Invalid filename: ${validation.error}`);
  }
  finalFilename = filename;
} else {
  finalFilename = generateUniqueFilename(file.name);
}
```

#### `uploadBadgeToSupabase.ts`
```typescript
// Before (UNSAFE)
const finalFilename = filename.endsWith('.png') ? filename : `${filename}.png`;

// After (SECURE)
const validation = validateFilename(filename);
if (!validation.isValid) {
  throw new Error(`Invalid filename: ${validation.error}`);
}

let finalFilename = filename;
if (!filename.match(/^\d{13,}-/)) {
  finalFilename = generateUniqueFilename(filename, 'badge');
}
finalFilename = ensureFileExtension(finalFilename, '.png');
```

## Filename Examples

### Input → Output Transformations

| Input Filename | Output Filename | Security Issue Addressed |
|----------------|-----------------|-------------------------|
| `My Photo.jpg` | `1703123456789-a1b2c3d4-my_photo.jpg` | Spaces, uniqueness |
| `file<>:"|?*\unsafe.txt` | `1703123456789-a1b2c3d4-file_unsafe.txt` | Unsafe characters |
| `../../../etc/passwd` | `1703123456789-a1b2c3d4-etc_passwd` | Path traversal |
| `UPPERCASE_FILE.PNG` | `1703123456789-a1b2c3d4-uppercase_file.png` | Case consistency |
| `   spaces   .txt` | `1703123456789-a1b2c3d4-spaces.txt` | Multiple spaces |

### Badge Filename Examples

| Input | Output | Description |
|-------|--------|-------------|
| `YEC-123456` | `badge-1703123456789-a1b2c3d4-yec-123456.png` | Generated unique |
| `1703123456789-existing.png` | `1703123456789-existing.png` | Already unique |

## Security Benefits

### 1. **Prevents File System Attacks**
- Blocks path traversal attempts
- Prevents directory listing attacks
- Stops file overwrite attempts

### 2. **Ensures URL Safety**
- No spaces or special characters in URLs
- Consistent lowercase naming
- Safe for web servers and CDNs

### 3. **Prevents Collisions**
- Timestamp ensures chronological ordering
- UUID prevents simultaneous upload conflicts
- Unique identifiers for tracking

### 4. **Improves Compatibility**
- Works across different operating systems
- Safe for database storage
- Compatible with cloud storage services

## Testing

### Manual Testing
Run the test suite to verify functionality:
```bash
# The test file includes comprehensive test cases
node app/lib/filenameUtils.test.ts
```

### Test Coverage
- ✅ Character sanitization
- ✅ Path traversal prevention
- ✅ Length validation
- ✅ Extension handling
- ✅ Uniqueness generation
- ✅ Error handling

## Dependencies Added

```json
{
  "dependencies": {
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.8"
  }
}
```

## Migration Notes

### For Existing Files
- Existing files with unsafe names will continue to work
- New uploads will use the secure naming system
- No migration of existing files required

### For Developers
- All new uploads automatically use secure filenames
- Validation prevents unsafe filenames from being uploaded
- Error messages provide clear guidance for fixes

## Best Practices

### 1. **Always Use the Utilities**
```typescript
// ✅ Good
const filename = generateUniqueFilename(originalName);

// ❌ Bad
const filename = `${Date.now()}-${originalName}`;
```

### 2. **Validate User Input**
```typescript
// ✅ Good
const validation = validateFilename(userInput);
if (!validation.isValid) {
  throw new Error(validation.error);
}

// ❌ Bad
const filename = userInput; // Direct use without validation
```

### 3. **Use Appropriate Prefixes**
```typescript
// ✅ Good
const filename = generateUniqueFilename(originalName, 'profile');

// ❌ Bad
const filename = generateUniqueFilename(originalName); // No organization
```

## Monitoring and Logging

The system includes comprehensive logging:
- Upload attempts with original and sanitized filenames
- Validation failures with detailed error messages
- Unique filename generation for tracking
- Security event logging for audit trails

This ensures all file operations are traceable and secure. 