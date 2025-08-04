# Preview Page Flow Test Documentation

## Test Scenario: Complete Registration Flow

### Prerequisites
- Next.js development server running
- All components properly built

### Test Steps

#### 1. Form Submission to Preview
1. Navigate to the main registration form (`/`)
2. Fill out all required fields:
   - Personal information (title, name, phone, email, etc.)
   - Business information (company, business type)
   - Upload required images (profile, chamber card, payment slip)
   - Accommodation preferences
   - Travel type
3. Click "ส่งข้อมูลการลงทะเบียน" button
4. **Expected Result**: Redirected to `/preview` page

#### 2. Preview Page Display
1. Verify all form data is displayed correctly:
   - Personal information section
   - Business information section
   - Accommodation information section
   - Uploaded images display properly
2. **Expected Result**: All data visible and properly formatted

#### 3. PDPA Consent
1. Try to click "ยืนยันการลงทะเบียน" without checking PDPA checkbox
2. **Expected Result**: Button disabled, error message appears
3. Check the PDPA consent checkbox
4. **Expected Result**: Submit button becomes enabled

#### 4. Edit Functionality
1. Click "แก้ไขข้อมูล" button
2. **Expected Result**: Redirected back to main form (`/`) with data preserved

#### 5. Submit Functionality
1. Return to preview page (complete form again if needed)
2. Check PDPA consent
3. Click "ยืนยันการลงทะเบียน"
4. **Expected Result**: 
   - Loading state shows
   - API call made to `/api/register`
   - Redirected to `/success` with registration ID

#### 6. Success Page
1. Verify success page displays:
   - Success message
   - Registration ID
   - Next steps information
   - Contact information
2. Click "กลับหน้าหลัก"
3. **Expected Result**: Redirected to main page

### Error Handling Tests

#### 1. Missing Form Data
1. Navigate directly to `/preview` without completing form
2. **Expected Result**: Redirected to `/`

#### 2. API Error
1. Complete form and reach preview page
2. Simulate API error (network issue)
3. **Expected Result**: Error message displayed, user can retry

#### 3. Invalid Form Data
1. Submit form with missing required fields
2. **Expected Result**: Form validation prevents submission

### Responsive Design Tests

#### 1. Desktop (1024px+)
- Verify 2-column layout for form data
- Check proper spacing and typography

#### 2. Tablet (768px - 1023px)
- Verify responsive grid adjustments
- Check image sizing

#### 3. Mobile (< 768px)
- Verify single-column layout
- Check touch-friendly button sizes
- Verify readable text sizes

### Technical Verification

#### 1. localStorage Integration
- Verify form data is saved to localStorage
- Verify data is cleared after successful submission

#### 2. API Integration
- Verify POST request to `/api/register`
- Verify proper error handling
- Verify registration ID generation

#### 3. Image Handling
- Verify uploaded images display correctly
- Verify proper image sizing and aspect ratio
- Verify object-contain CSS class applied

### Performance Tests

#### 1. Loading Performance
- Verify preview page loads quickly
- Verify images load efficiently

#### 2. Memory Management
- Verify localStorage is properly cleaned up
- Verify no memory leaks from image objects

## Success Criteria

✅ **All test scenarios pass**
✅ **Responsive design works on all screen sizes**
✅ **Error handling works correctly**
✅ **User flow is intuitive and smooth**
✅ **PDPA consent is properly enforced**
✅ **Data persistence works correctly**

## Notes

- The current implementation uses localStorage for data persistence
- API currently logs data instead of storing in database
- File uploads are handled in memory (not persisted)
- Registration ID is generated client-side for demo purposes

## Next Steps

1. Implement database storage
2. Add file upload persistence
3. Implement email notifications
4. Add comprehensive testing framework 