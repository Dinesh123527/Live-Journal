# 🧪 Live Journal Frontend - Testing Guide

This guide will help you test all the features in your Live Journal application.

---

## 🚀 Quick Start

### 1. Start the Application

```bash
# Navigate to frontend directory
cd "FE/livejournal-frontend"

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The app should start at `http://localhost:5173` (or another port shown in terminal).

### 2. Start the Backend (in another terminal)

```bash
# Navigate to backend directory
cd "livejournal-backend"

# Install dependencies (if not already done)
npm install

# Start backend server
npm start
```

Backend should start at `http://localhost:5000` (or your configured port).

---

## 📋 Features to Test

### ✅ Feature 1: Page Transitions (Framer Motion)

**What to test:** Smooth animations when navigating between pages.

**Test Steps:**
1. Open `http://localhost:5173` in your browser
2. Navigate through the pages:
   - Landing (`/`) → Click "Get Started" or "Sign In"
   - Login (`/login`) → Click "Create New Account"
   - Signup (`/signup`) → Click back to "Sign In"
   - Navigate between different pages using browser back/forward

**Expected Result:**
- ✨ Pages slide in/out smoothly with spring physics
- 🎯 No janky or abrupt transitions
- 🌊 Natural, fluid motion between pages
- 📱 Landing page uses fade transition, others use slide

**What to look for:**
- [ ] Smooth entrance animations
- [ ] Smooth exit animations
- [ ] No flickering or jumps
- [ ] Consistent 60fps animation

---

### ✅ Feature 2: Pull-to-Refresh

**What to test:** Native mobile-like pull gesture to refresh content.

**Test Steps:**

**On Desktop (Mouse):**
1. Create an account and log in
2. Navigate to Dashboard (`/dashboard`)
3. Scroll to the very top of the page
4. Click and drag down from the top (like pulling down)
5. Drag at least 80px down
6. Release the mouse

**On Mobile/Tablet (Touch):**
1. Open the app on your phone/tablet
2. Log in and go to Dashboard
3. Pull down from the top of the screen with your finger
4. Pull until you see the refresh icon
5. Release

**Expected Result:**
- 🔄 Refresh icon appears when you pull down
- ⚡ Icon rotates while refreshing
- 📊 Console logs "Dashboard refreshed!"
- ✅ Page smoothly returns to normal position
- 💫 Natural spring animation on release

**What to look for:**
- [ ] Pull gesture is smooth
- [ ] Icon appears at correct distance
- [ ] Refresh animation plays
- [ ] Content updates (check console)
- [ ] Works with both mouse and touch

---

### ✅ Feature 3: Authentication Flow

**What to test:** Complete user registration and login flow.

**Test Steps:**

**Signup:**
1. Go to `http://localhost:5173/signup`
2. Fill in the form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "Test123!@#"
   - Confirm Password: "Test123!@#"
3. Click "Sign Up"

**Expected Result:**
- ✅ Form validation works
- ✅ Account is created
- ✅ Redirected to Welcome screen with AI greeting
- ✅ Navbar shows user profile

**Login:**
1. Log out (click logout in navbar)
2. Go to `/login`
3. Enter your credentials:
   - Email: "test@example.com"
   - Password: "Test123!@#"
4. Click "Sign In"

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to Welcome screen with personalized AI greeting
- ✅ User session persists
- ✅ Can navigate to Dashboard from Welcome screen

**What to look for:**
- [ ] Form validation works correctly
- [ ] Error messages display properly
- [ ] Password toggle (eye icon) works
- [ ] Successful authentication redirects to welcome screen
- [ ] AI greeting appears with typing animation
- [ ] Welcome screen shows username correctly

---

### ✅ Feature 4: Welcome Screen with AI Greeting

**What to test:** Personalized welcome experience after login/signup.

**Test Steps:**
1. Log in or sign up
2. Observe the Welcome screen that appears
3. Watch the AI greeting typing animation
4. Check that your username is displayed
5. Click "Continue Writing" or "Start Writing Your First Entry" button

**Expected Result:**
- ✨ Welcome screen loads with beautiful UI
- 🤖 AI greeting types out character by character
- 👤 Your username is displayed correctly
- 🎨 Three feature cards are displayed (Smart Writing, Mood Tracking, Private & Secure)
- ➡️ Button navigates to Dashboard

**What to look for:**
- [ ] Welcome screen appears after login/signup
- [ ] AI greeting animation is smooth
- [ ] Username displays correctly
- [ ] Feature cards are visible
- [ ] Button text changes based on new/returning user
- [ ] No "Skip" button (full experience for all users)

---

### ✅ Feature 5: Protected Routes

**What to test:** Dashboard is protected and requires authentication.

**Test Steps:**
1. Log out if logged in
2. Try to manually navigate to `/dashboard` in the URL bar
3. Check what happens

**Expected Result:**
- 🔒 If not logged in, redirected to landing or login page
- ✅ If logged in, dashboard loads normally

---

### ✅ Feature 6: Responsive Design

**What to test:** App works on different screen sizes.

**Test Steps:**
1. Open Developer Tools (F12 or Cmd+Option+I)
2. Toggle device toolbar (phone icon) or press Cmd+Shift+M
3. Test these viewports:
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - Desktop (1920x1080)
4. Navigate through all pages

**Expected Result:**
- 📱 Mobile: Stack layout, touch-friendly buttons
- 💻 Tablet/Desktop: Centered cards, larger spacing
- 🎨 All features work across devices
- 🔄 Pull-to-refresh works on touch devices

**What to look for:**
- [ ] Layout adapts properly
- [ ] No horizontal scrolling
- [ ] Text is readable at all sizes
- [ ] Buttons are touch-friendly on mobile

---

### ✅ Feature 7: Dark Mode (if implemented)

**What to test:** Check if dark mode styling works.

**Test Steps:**
1. Check your system theme settings
2. Switch between light and dark mode
3. Observe the app's appearance

**Expected Result:**
- 🌙 Dark mode styles apply if system is in dark mode
- ☀️ Light mode styles apply if system is in light mode

---

## 🐛 Common Issues & Solutions

### Issue: Page transitions are janky

**Solutions:**
- Close other browser tabs to free resources
- Disable browser extensions temporarily
- Check if hardware acceleration is enabled in browser settings
- Try a different browser (Chrome/Edge recommended)

### Issue: Pull-to-refresh not working

**Solutions:**
- Make sure you're scrolled to the very top
- Pull distance must exceed 80px
- On desktop, click and drag (don't just move cursor)
- Check browser console for JavaScript errors

### Issue: Can't log in

**Solutions:**
- Verify backend is running on correct port
- Check Network tab in DevTools for API errors
- Verify database connection in backend
- Check if CORS is properly configured

### Issue: Routes not working

**Solutions:**
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
- Check if React Router is working (no console errors)
- Verify all imports in App.jsx are correct

---

## 📊 Testing Checklist

Use this checklist to ensure all features are working:

### Navigation & Transitions
- [ ] Landing page loads with fade animation
- [ ] Login page slides in smoothly
- [ ] Signup page slides in smoothly
- [ ] Dashboard page slides in smoothly
- [ ] Browser back button works with animations
- [ ] No animation glitches or flickers

### Authentication
- [ ] Can create new account
- [ ] Form validation works
- [ ] Can log in with credentials
- [ ] Can log out
- [ ] Protected routes work correctly
- [ ] Session persists on page reload
- [ ] No biometric UI appears anywhere

### Pull-to-Refresh
- [ ] Works on Dashboard
- [ ] Pull gesture is smooth
- [ ] Refresh icon appears
- [ ] Spinner animates during refresh
- [ ] Works with mouse (desktop)
- [ ] Works with touch (mobile)

### Responsive Design
- [ ] Mobile view (< 640px) works
- [ ] Tablet view (640-1024px) works
- [ ] Desktop view (> 1024px) works
- [ ] No layout breaking at any size

### Performance
- [ ] Pages load quickly
- [ ] Animations are 60fps
- [ ] No console errors
- [ ] No memory leaks (test with DevTools)

---

## 🎯 Manual Test Scenarios

### Scenario 1: New User Journey
1. Visit landing page
2. Click "Get Started"
3. Fill signup form
4. Submit and verify redirect to dashboard
5. See welcome message
6. Pull to refresh dashboard
7. Log out
8. Log back in

**Expected:** Smooth experience, no errors, all features work

### Scenario 2: Returning User
1. Visit app (should be logged out)
2. Click "Sign In"
3. Enter credentials
4. Verify redirect to dashboard
5. Test pull-to-refresh
6. Navigate to different sections (when available)

**Expected:** Quick login, instant access to dashboard

### Scenario 3: Error Handling
1. Try to signup with existing email
2. Try to login with wrong password
3. Try to access `/dashboard` without login
4. Submit forms with invalid data

**Expected:** Clear error messages, graceful handling

---

## 🔍 Browser DevTools Testing

### Console Tab
**Check for:**
- No JavaScript errors
- "Dashboard refreshed!" message when pulling to refresh
- No warnings about missing dependencies

### Network Tab
**Check for:**
- API calls to `/auth/login` and `/auth/signup` succeed
- Response status codes (200, 401, etc.)
- Proper request/response payloads

### Performance Tab
**Check for:**
- 60fps animations (green bars)
- No long tasks blocking the main thread
- Smooth page transitions

---

## ✅ Success Criteria

Your app is working correctly if:

1. ✅ All page transitions are smooth and natural
2. ✅ Pull-to-refresh works on Dashboard
3. ✅ Authentication (signup/login/logout) functions properly
4. ✅ No biometric-related UI or errors appear
5. ✅ App is responsive on all screen sizes
6. ✅ No console errors during normal usage
7. ✅ Protected routes work correctly
8. ✅ User session persists properly

---

## 📝 Reporting Issues

If you find bugs, note:
- Browser and version
- Device and screen size
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots/recordings

---

**Happy Testing! 🚀**

If everything passes, your Live Journal app is production-ready with world-class page transitions and pull-to-refresh functionality!
