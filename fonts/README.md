# Fonts Directory

This directory contains font files used by the YEC Badge Generation System.

## Required Font

### NotoSansThai-Regular.ttf
- **Purpose**: Thai text rendering in generated badges
- **Source**: Google Fonts - Noto Sans Thai
- **Download URL**: https://fonts.google.com/noto/specimen/Noto+Sans+Thai
- **File Size**: ~1.2MB

## Installation Instructions

1. **Download the font**:
   ```bash
   # Download Noto Sans Thai Regular
   curl -o NotoSansThai-Regular.ttf "https://fonts.gstatic.com/s/notosansthai/v21/iJWnBXeMan_i4p8NXV2V_VNLqEtd6zM.woff2"
   ```

2. **Or manually download**:
   - Visit: https://fonts.google.com/noto/specimen/Noto+Sans+Thai
   - Click "Download family"
   - Extract the ZIP file
   - Copy `NotoSansThai-Regular.ttf` to this directory

3. **Verify installation**:
   ```bash
   ls -la NotoSansThai-Regular.ttf
   ```

## Font Registration

The badge generator will automatically:
1. Look for `NotoSansThai-Regular.ttf` in this directory
2. Register it using `registerFont()` from the canvas library
3. Use it for all Thai text rendering in badges
4. Fall back to system fonts if not available

## Testing

After adding the font, test badge generation:
```bash
curl -X POST http://localhost:3000/api/test-badge \
  -H "Content-Type: application/json" \
  -o test-badge.png
```

## Fallback System

If NotoSansThai is not available, the system will try:
1. Thonburi (macOS)
2. Arial Unicode MS (macOS)
3. DejaVu Sans (Linux)
4. Arial (fallback)

## Troubleshooting

### Font not loading
- Check file permissions: `chmod 644 NotoSansThai-Regular.ttf`
- Verify file integrity: `file NotoSansThai-Regular.ttf`
- Check server logs for font registration messages

### Thai text still showing boxes (▯▯▯)
- Ensure font file is in the correct location
- Restart the development server
- Check console logs for font registration status

## License

Noto Sans Thai is licensed under the SIL Open Font License, Version 1.1.
See: https://fonts.google.com/noto/specimen/Noto+Sans+Thai 