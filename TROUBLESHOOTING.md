# 🔧 TROUBLESHOOTING GUIDE

## Common Issues

### 1. ⚠️ "TMDB API key" error on startup
**Problem**: The app throws on load.

**Root Cause**: `NEXT_PUBLIC_TMDB_API_KEY` is not set.

**Solution**: Add it to `.env` locally, or set it in the Render dashboard
(`render.yaml` declares it as a `sync: false` variable).

### 2. ⚪ White screen / stale page
**Problem**: The page renders blank, or shows an old build.

**Root Cause**: Cached chunks from a previous build, especially after a
config change.

**Solution**: Hard reload — F12 → right-click the refresh button →
**Empty Cache and Hard Reload**. If it persists, delete `.next` and restart.

### 3. ❌ 404 on `_next/static/chunks/*.js`
**Problem**: Failed to load resource: 404 (Not Found).

**Root Cause**: Stale `.next` build cache.

**Solution**: Remove `.next` and restart.

### 4. 🎬 Player shows "This content can't be embedded in a sandboxed frame"
**Problem**: Playback fails on a watch page.

**Root Cause**: A `sandbox` attribute was added to the player iframe.

**Solution**: Remove it. The embed host refuses to render inside a sandboxed
frame, and adding `allow-same-origin` + `allow-scripts` provides no real
isolation for a cross-origin frame anyway. See `docs/ADBLOCK.md`.

---

## 🚀 HOW TO START

### Option 1: Automatic Startup (Recommended)

```powershell
cd C:\Users\compu\OneDrive\Documents\cinescope
.\start-dev.ps1
```

This script will:
- ✓ Kill any existing Node processes
- ✓ Clean the `.next` build cache
- ✓ Start CineScope on port 8080

### Option 2: Manual Startup

```bash
cd C:\Users\compu\OneDrive\Documents\cinescope
npm run dev
```

---

## ✅ EXPECTED BEHAVIOR

1. Open **http://localhost:8080**
2. The movie browsing interface loads
3. Search and detail pages work
4. Watch pages embed the player in an iframe
5. Ad blocking is applied by your browser, not the site (see `docs/ADBLOCK.md`)

---

## 🎯 VERIFICATION CHECKLIST

- [ ] Server is running on port 8080
- [ ] `NEXT_PUBLIC_TMDB_API_KEY` is set
- [ ] http://localhost:8080 loads the movie grid
- [ ] No 404 errors in the console
- [ ] The player iframe plays without a `sandbox` attribute

---

## 🐛 IF STILL NOT WORKING

### Check 1: Is the server running?

```powershell
Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet
```

Should return `True`.

### Check 2: Browser console errors

1. Open http://localhost:8080
2. Press F12
3. Check the Console tab
4. Common issues:
   - CORS errors from the player iframe → Expected, harmless
   - 404 on chunks → Build cache issue, remove `.next` and restart
   - Connection refused → The server isn't running

### Check 3: Force clean restart

```powershell
# Stop everything
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clean cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Restart
npm run dev
```

---

## 📊 CONFIGURATION SUMMARY

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **CineScope** | 8080 | http://localhost:8080 | Movie and series web app |

---

## 🛡️ AD BLOCKING STATUS

Blocking happens in **your browser**, because the player is a cross-origin
iframe that site code cannot modify. Three supported options are documented in
`docs/ADBLOCK.md`:

1. **uBlock Origin** — recommended, install from your browser's store.
2. **Bundled MV3 extension** — download and "load unpacked" via
   `chrome://extensions`.
3. **Tampermonkey userscript** — served from `/adblock` on the running app.

---

*Last updated: 2026-09-30*
