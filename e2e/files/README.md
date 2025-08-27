# E2E Test Files

This directory contains test files used for E2E testing of the YEC Registration system.

## File Requirements

The following files should be created for comprehensive testing:

### Profile Images
- `profile-ok.jpg` (~100KB) - Valid profile image
- `profile-too-big.jpg` (~3MB) - Oversized profile image for validation testing

### Payment Documents
- `payment-ok.jpg` (~100KB) - Valid payment slip image
- `payment-ok.pdf` (~100KB) - Valid payment slip PDF
- `payment-too-big.pdf` (~6MB) - Oversized payment document for validation testing

### TCC Documents
- `tcc-ok.jpg` (~100KB) - Valid TCC document image
- `profile-wrong-type.pdf` (~100KB) - PDF file with wrong type for profile upload testing

## File Generation

For testing purposes, you can generate dummy files using the following commands:

```bash
# Generate dummy JPG files
convert -size 800x600 xc:white -pointsize 40 -annotate +100+300 "Test Image" e2e/files/profile-ok.jpg
convert -size 800x600 xc:white -pointsize 40 -annotate +100+300 "Payment Slip" e2e/files/payment-ok.jpg
convert -size 800x600 xc:white -pointsize 40 -annotate +100+300 "TCC Document" e2e/files/tcc-ok.jpg

# Generate large test file (3MB)
dd if=/dev/zero bs=1M count=3 | convert -size 1920x1080 -depth 8 rgb:- e2e/files/profile-too-big.jpg

# Generate large PDF (6MB)
dd if=/dev/zero bs=1M count=6 > e2e/files/payment-too-big.pdf

# Generate small PDF files
echo "Test PDF content" | ps2pdf - e2e/files/payment-ok.pdf
echo "Wrong type PDF" | ps2pdf - e2e/files/profile-wrong-type.pdf
```

## File Validation

These files are used to test:
- File upload functionality
- File size validation
- File type validation
- Error message display
- Form submission with various file types

## Notes

- Keep file sizes within repository limits
- Use consistent naming conventions
- Ensure files are not committed to version control if they contain sensitive data
- Update this README when adding new test files
