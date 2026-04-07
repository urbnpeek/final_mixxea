# MIXXEA Records - Quick Test Guide
## SEO & Mobile Improvements

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your values (optional for local testing)
```

### 3. Run Locally
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

Open: **http://localhost:3000**

---

## Testing Mobile Responsiveness

### Using Chrome DevTools
1. Open DevTools: `F12` or `Ctrl+Shift+I`
2. Click device icon: top-left corner
3. Test breakpoints:
   - **320px** (iPhone SE)
   - **375px** (iPhone)
   - **768px** (iPad)
   - **1024px** (Laptop)
   - **1920px** (Desktop)

### Key Areas to Test
- ✅ Hero section scales properly
- ✅ Navigation collapses on mobile
- ✅ Audio player is usable
- ✅ Forms are touch-friendly
- ✅ Text is readable (not too small)
- ✅ Images load correctly

### Real Device Testing
Test on actual phones:
- Android phone (test both landscape & portrait)
- iPhone (iOS Safari)
- Tablet (iPad, Android tablet)

---

## Testing SEO & Metadata

### 1. Check Meta Tags
In browser console (`F12` → Console):
```javascript
// Check title
document.title

// Check meta description
document.querySelector('meta[name="description"]').content

// Check Open Graph
document.querySelector('meta[property="og:title"]').content
```

### 2. Test Search Engine Metadata
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **Google**: https://search.google.com/structured-data/testing-tool
- **LinkedIn**: https://www.linkedin.com/post-inspector/

### 3. Validate Structured Data
```bash
# JSON-LD is in the <head> section
# Validate at: https://schema.org/validator
```

### 4. Check Robots.txt and Sitemap
```
http://localhost:3000/robots.txt
http://localhost:3000/sitemap.xml
```

---

## Testing Security Headers

### Online Tool
Visit: https://securityheaders.com and enter:
```
http://localhost:3000 (for local testing)
```

### Using curl
```bash
curl -I http://localhost:3000
```

Check for these headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Testing Accessibility

### Keyboard Navigation
- `Tab` through all buttons - should be accessible
- `Enter` should activate buttons
- `Escape` should close modals

### Screen Reader Ready
Use browser extensions:
- **axe DevTools** (Chrome)
- **WAVE** (Firefox)
- **NoCoffee** (vision testing)

### Color Contrast
All text should have sufficient contrast (tested in CSS).

---

## Performance Testing

### Google PageSpeed Insights
```
https://pagespeed.web.dev/
```

### Local Performance
```bash
# With compression enabled
curl -I -H "Accept-Encoding: gzip" http://localhost:3000
```

Should show:
```
Content-Encoding: gzip
```

---

## Admin Panel Testing

1. Click **"Admin ⚙"** button in nav
2. Look for:
   - ✅ Responsive admin layout on mobile
   - ✅ All forms work
   - ✅ Tables are scrollable on mobile

---

## Browser Compatibility Checklist

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Common Issues & Fixes

### Issue: Mobile menu not visible
**Fix**: Ensure viewport meta tag is present (it is)

### Issue: Forms not responsive
**Fix**: All form fields use Flexbox - should adapt automatically

### Issue: Audio player broken on mobile
**Fix**: Howler.js loaded from CDN - check network tab in DevTools

### Issue: Fonts look weird
**Fix**: Google Fonts are preloaded - check CSS `@import` is working

---

## Before Going Live Checklist

- [ ] Test on 3+ real devices
- [ ] Verify robots.txt allows crawling
- [ ] Check sitemap.xml is valid
- [ ] Security headers score A+ on securityheaders.com
- [ ] All links work (no 404s)
- [ ] Forms submit successfully
- [ ] Admin panel accessible
- [ ] Audio player works in all browsers
- [ ] Mobile responsiveness looks good

---

## Quick Commands

```bash
# Install & run
npm install && npm run dev

# Test specific port
npm start

# Check Node version
node --version

# Kill port if stuck
# Linux/Mac: kill -9 $(lsof -t -i :3000)
# Windows: netstat -ano | findstr :3000
```

---

## Resources

- **SEO**: https://www.semrush.com/seo-audit-tool/
- **Mobile**: https://search.google.com/test/mobile-friendly
- **Security**: https://www.nist.gov/cybersecurity
- **Accessibility**: https://www.w3.org/WAI/

---

**All improvements are production-ready!**
Test thoroughly before deployment.
