# Development Modes - Quick Reference

This document provides a quick reference for the three development modes available in TarkovTracker.

## TL;DR - Which Command Should I Use?

```bash
# Working on UI/components only? → Fastest option
npm run dev

# Need to test auth, teams, or functions? → Full backend
npm run dev:full

# Testing production build before deploy? → Complete simulation
npm run dev:firebase
```

---

## The Three Modes Explained

### 1️⃣ `npm run dev` - Pure Frontend Development

**When to use:** Daily UI/component work, styling, routing

**What runs:**

- ✅ Vite dev server (port 3000)
- ❌ No Firebase emulators

**Features:**

- Lightning-fast HMR (Hot Module Replacement)
- Works with localStorage for persistence
- Mock auth available via `VITE_DEV_AUTH=true`

**Limitations:**

- No real Firebase auth (unless mocked)
- No Cloud Functions
- No Firestore sync
- No team features

**Best for:** 90% of frontend development

---

### 2️⃣ `npm run dev:full` - Full-Stack Development

**When to use:** Testing auth flows, team features, API tokens, real-time sync

**What runs:**

- ✅ Vite dev server (port 3000)
- ✅ Firebase Auth emulator (port 9099)
- ✅ Firestore emulator (port 5002)
- ✅ Cloud Functions emulator (port 5001)
- ❌ No hosting emulator (not needed)

**Features:**

- Full Firebase integration
- Real auth flows
- Cloud Functions testing
- Firestore real-time sync
- Team features work

**Access:**

- Frontend: <http://localhost:3000>
- Emulator UI: <http://localhost:4999>

**Best for:** Backend-heavy feature development

---

### 3️⃣ `npm run dev:firebase` - Production Build Testing

**When to use:** Pre-deployment verification, production bug testing

**What runs:**

- ✅ Full production build (builds first)
- ✅ Firebase Hosting emulator (port 5000)
- ✅ All Firebase emulators (auth, firestore, functions)
- ❌ No Vite dev server

**Features:**

- Tests actual production code
- Minified/optimized bundles
- Firebase Hosting behavior
- Complete emulation of production

**Access:**

- Production build: <http://localhost:5000>
- Emulator UI: <http://localhost:4999>

**Best for:** Final testing before deployment

---

## Quick Comparison Table

| Feature | `npm run dev` | `npm run dev:full` | `npm run dev:firebase` |
|---------|---------------|-------------------|----------------------|
| **Vite HMR** | ✅ Yes | ✅ Yes | ❌ No |
| **Production Build** | ❌ No | ❌ No | ✅ Yes |
| **Auth Emulator** | ❌ No* | ✅ Yes | ✅ Yes |
| **Firestore Emulator** | ❌ No | ✅ Yes | ✅ Yes |
| **Functions Emulator** | ❌ No | ✅ Yes | ✅ Yes |
| **Hosting Emulator** | ❌ No | ❌ No | ✅ Yes |
| **Startup Speed** | ⚡ Instant | 🐢 ~10-15s | 🐌 ~30-60s (build time) |
| **Frontend Port** | 3000 | 3000 | 5000 |

*Mock auth available with `VITE_DEV_AUTH=true`

---

## Setting Up Mock Auth for `npm run dev`

If you need to test auth-gated features without running emulators:

1. **Create environment file:**

   ```bash
   cp frontend/.env.local.example frontend/.env.local
   ```

2. **Enable mock auth:**

   ```bash
   # Edit frontend/.env.local and add:
   VITE_DEV_AUTH=true
   ```

3. **Start dev server:**

   ```bash
   npm run dev
   ```

You'll be automatically logged in as `dev@localhost.local` with a persistent user ID.

**Toggle mock auth on/off:**

```bash
# Disable mock auth
VITE_DEV_AUTH=false

# Or just remove the line entirely
```

---

## Port Reference

| Port | Service | Active In |
|------|---------|-----------|
| **3000** | Vite Dev Server | `dev`, `dev:full` |
| **4999** | Firebase Emulator UI | `dev:full`, `dev:firebase` |
| **5000** | Hosting Emulator | `dev:firebase` |
| **5001** | Functions Emulator | `dev:full`, `dev:firebase` |
| **5002** | Firestore Emulator | `dev:full`, `dev:firebase` |
| **9099** | Auth Emulator | `dev:full`, `dev:firebase` |

---

## Workflow Recommendations

### Typical Development Day

1. **Start with `npm run dev`** for UI work
2. **Switch to `npm run dev:full`** when you need to test:
   - User login/logout
   - Team creation/management
   - API token generation
   - Real-time sync features
3. **Run `npm run dev:firebase`** before:
   - Creating a PR
   - Deploying to staging/production
   - Investigating production-only bugs

### When You're Confused About Behavior

If something works differently between dev and production:

1. **Test in `npm run dev:firebase`** first
2. If it works there but not in production → deployment issue
3. If it fails there too → production build issue
4. Check for Vite-specific assumptions in your code

---

## Common Issues & Solutions

### "It works on port 3000 but not port 5000"

**Problem:** Vite dev mode is more forgiving than production builds
**Solution:** Run `npm run dev:firebase` to catch build issues early

### "Functions aren't responding"

**Problem:** Functions emulator might not be running
**Check:**

- Using `npm run dev`? Functions won't work (by design)
- Using `npm run dev:full`? Check <http://localhost:4999> for emulator status

### "Auth keeps failing"

**Solutions:**

- `npm run dev` → Set `VITE_DEV_AUTH=true` for mock auth
- `npm run dev:full` → Use Firebase emulator auth at <http://localhost:4999>
- `npm run dev:firebase` → Same as `dev:full`

### "Port already in use"

**Solution:**

```bash
# Kill process on port 3000 (Vite)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5000 (Hosting)
lsof -ti:5000 | xargs kill -9
```

---

## Advanced: Custom Emulator Configurations

### Run only specific emulators

```bash
# Just Auth + Firestore (no Functions)
npm run build:functions && firebase emulators:start --only auth,firestore

# Just Functions (for backend testing)
npm run build:functions && firebase emulators:start --only functions
```

### Import/export emulator data

```bash
# Import local data on start
npm run emulators:local

# Export current emulator data
firebase emulators:export ./local_data
```

---

## Summary

- **Fast iteration** → `npm run dev`
- **Full features** → `npm run dev:full`
- **Pre-deploy check** → `npm run dev:firebase`

Choose based on what you're working on, not habit. Most days you'll only need `npm run dev`!
