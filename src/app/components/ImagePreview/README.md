# Image Preview Component Testing Guide

## Overview
This document provides guidance on testing the Image Preview component across different devices and screen sizes.

## Manual Testing Instructions

### Desktop Testing
1. Test with different browser window sizes (resize browser)
2. Test with high-DPI displays (retina screens)
3. Test with different browsers (Chrome, Firefox, Safari, Edge)
4. Test keyboard navigation (Tab, Enter, Space, Escape, Arrow keys)
5. Test with images of different aspect ratios and sizes
6. Test loading states with slow network conditions (use browser dev tools)
7. Test error handling by providing invalid image URLs

### Mobile Testing
1. Test in portrait and landscape orientations
2. Test on different screen sizes (iPhone SE, iPhone 14 Pro Max, various Android devices)
3. Test touch interactions (tap, pinch zoom in modal)
4. Test with mobile browsers (Chrome, Safari, Firefox)
5. Test with "Add to Home Screen" PWA functionality
6. Test with "Dark Mode" enabled

### Accessibility Testing
1. Test with screen readers (VoiceOver, NVDA, JAWS)
2. Test keyboard-only navigation
3. Test with high contrast mode enabled
4. Test with reduced motion preferences enabled
5. Test with zoomed text (150%, 200%)
6. Test with inverted colors

## Automated Testing Recommendations

Add these tests to your testing suite:

```javascript
// Example test cases for ImagePreview component

describe('ImagePreview Component', () => {
  it('should render image with correct alt text', () => {
    // Test that alt text is properly set
  });

  it('should handle image loading state', () => {
    // Test loading spinner appears while image loads
  });

  it('should handle image error state', () => {
    // Test error message appears for invalid image URL
  });

  it('should open modal on click', () => {
    // Test modal opens when image is clicked
  });

  it('should close modal on escape key', () => {
    // Test modal closes when Escape key is pressed
  });

  it('should be accessible via keyboard', () => {
    // Test component can be focused and activated with keyboard
  });

  it('should respond to responsive breakpoints', () => {
    // Test styles change at different breakpoints
  });
});
```

## Browser DevTools Testing Tips

1. Use Chrome DevTools Device Toolbar to simulate different devices
2. Use Network Throttling to test loading states (Slow 3G, Fast 3G)
3. Use Rendering tab to test:
   - Emulate CSS media feature prefers-reduced-motion
   - Emulate CSS media feature prefers-contrast
   - Enable accessibility debugging
4. Use Lighthouse to audit performance, accessibility, and best practices

## Performance Testing

1. Check Largest Contentful Paint (LCP) for images
2. Verify images are lazy-loaded below the fold
3. Check that placeholder images are used effectively
4. Verify proper image compression and quality settings
5. Test with Chrome DevTools Performance tab

## Cross-Browser Compatibility

Test on:
- Latest Chrome
- Latest Firefox
- Latest Safari
- Latest Edge
- Mobile Safari (iOS)
- Chrome for Android

Note any rendering differences and adjust CSS as needed.
