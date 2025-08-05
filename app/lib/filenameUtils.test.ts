import { sanitizeFilename, generateUniqueFilename, validateFilename, ensureFileExtension } from './filenameUtils';

// Test cases for filename sanitization
const testCases = [
  {
    input: 'My Photo.jpg',
    expected: 'my_photo.jpg',
    description: 'Spaces and mixed case'
  },
  {
    input: 'file with spaces and (parentheses).png',
    expected: 'file_with_spaces_and_parentheses.png',
    description: 'Spaces and special characters'
  },
  {
    input: 'file<>:"|?*\\/unsafe.txt',
    expected: 'file_unsafe.txt',
    description: 'Unsafe characters'
  },
  {
    input: '../../../etc/passwd',
    expected: 'etc_passwd',
    description: 'Path traversal attempt'
  },
  {
    input: '   multiple   spaces   ',
    expected: 'multiple_spaces',
    description: 'Multiple spaces and trimming'
  },
  {
    input: 'UPPERCASE_FILE.PNG',
    expected: 'uppercase_file.png',
    description: 'Uppercase conversion'
  },
  {
    input: 'file_with_underscores.txt',
    expected: 'file_with_underscores.txt',
    description: 'Already safe filename'
  },
  {
    input: '',
    expected: '',
    description: 'Empty string'
  },
  {
    input: 'a'.repeat(100) + '.txt',
    expected: 'a'.repeat(50) + '.txt',
    description: 'Long filename truncation'
  }
];

// Test filename validation
const validationTestCases = [
  {
    input: 'safe-file.txt',
    expected: true,
    description: 'Safe filename'
  },
  {
    input: 'file with spaces.txt',
    expected: false,
    description: 'Filename with spaces'
  },
  {
    input: 'file<unsafe>.txt',
    expected: false,
    description: 'Filename with unsafe characters'
  },
  {
    input: '../../../etc/passwd',
    expected: false,
    description: 'Path traversal attempt'
  },
  {
    input: '',
    expected: false,
    description: 'Empty filename'
  },
  {
    input: 'a'.repeat(300),
    expected: false,
    description: 'Too long filename'
  }
];

// Test file extension handling
const extensionTestCases = [
  {
    input: 'file',
    extension: '.png',
    expected: 'file.png',
    description: 'Add extension to file without extension'
  },
  {
    input: 'file.jpg',
    extension: '.png',
    expected: 'file.jpg',
    description: 'File already has different extension'
  },
  {
    input: 'file.png',
    extension: '.png',
    expected: 'file.png',
    description: 'File already has correct extension'
  },
  {
    input: 'FILE.PNG',
    extension: '.png',
    expected: 'FILE.PNG',
    description: 'Case insensitive extension check'
  }
];

// Run tests
console.log('🧪 Testing Filename Utilities...\n');

// Test sanitizeFilename
console.log('📝 Testing sanitizeFilename:');
testCases.forEach(({ input, expected, description }) => {
  const result = sanitizeFilename(input);
  const passed = result === expected;
  console.log(`${passed ? '✅' : '❌'} ${description}: "${input}" -> "${result}" (expected: "${expected}")`);
});

console.log('\n🔍 Testing validateFilename:');
validationTestCases.forEach(({ input, expected, description }) => {
  const result = validateFilename(input);
  const passed = result.isValid === expected;
  console.log(`${passed ? '✅' : '❌'} ${description}: "${input}" -> ${result.isValid} (expected: ${expected})`);
  if (!passed && result.error) {
    console.log(`   Error: ${result.error}`);
  }
});

console.log('\n📎 Testing ensureFileExtension:');
extensionTestCases.forEach(({ input, extension, expected, description }) => {
  const result = ensureFileExtension(input, extension);
  const passed = result === expected;
  console.log(`${passed ? '✅' : '❌'} ${description}: "${input}" + "${extension}" -> "${result}" (expected: "${expected}")`);
});

console.log('\n🆔 Testing generateUniqueFilename:');
const unique1 = generateUniqueFilename('test.jpg', 'prefix');
const unique2 = generateUniqueFilename('test.jpg', 'prefix');
console.log(`✅ Generated unique filename 1: ${unique1}`);
console.log(`✅ Generated unique filename 2: ${unique2}`);
console.log(`✅ Filenames are different: ${unique1 !== unique2}`);

console.log('\n🎉 All tests completed!'); 