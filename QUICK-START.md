# 🚀 QUICK START GUIDE - CineScope

**Last Updated**: September 30, 2026

---

## ⚡ TWO STEPS TO GET RUNNING

### 1️⃣ INSTALL

```bash
npm install
```

### 1.5️⃣ CONFIGURE

```bash
cp .env.example .env
```

Then paste your TMDB v3 API key after `NEXT_PUBLIC_TMDB_API_KEY=`. The app
throws on startup without it. On Render, set the same variable in the
dashboard instead (see `render.yaml`).

### 2️⃣ START THE SERVER

**Option A - Automatic (Recommended):**
```powershell
.\start-dev.ps1
```

**Option B - Manual:**
```bash
npm run dev
```

Wait 10-15 seconds for the server to start, then open
**http://localhost:8080**.

---

## ⚙️ CONFIGURATION SUMMARY

| Setting | Value | Status |
|---------|-------|--------|
| **CineScope Port** | 8080 | ✅ |
| **Required env var** | `NEXT_PUBLIC_TMDB_API_KEY` | ✅ |

The site throws a hard error if the TMDB key is missing, so set it in `.env`
before running. On Render, set it in the dashboard (see `render.yaml`).

**Default player source**: Filmu. If it does not play, use "Switch Provider"
on the watch page to try MultiEmbed, VidCore, VidSrc or CineSrc.

---

## 🎯 HOW IT WORKS

```
User opens the site
    ↓
http://localhost:8080 (Next.js app)
    ↓
Browses and searches via the TMDB API
    ↓
/watch/[id] embeds the player in a cross-origin iframe
    ↓
Ad blocking is applied by the user's browser (uBlock Origin, the bundled
MV3 extension, or the Tampermonkey script) — see docs/ADBLOCK.md
```

---

## 🆘 STILL NOT WORKING?

### Quick Checks:

**1. Is the server running?**
```powershell
Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet
```
Should return `True`.

**2. Is the TMDB key set?**
- The app errors on startup without `NEXT_PUBLIC_TMDB_API_KEY`.

**3. Check the browser console**
- Press F12 → Console tab
- Look for errors

**4. Force clean restart**
```powershell
# Stop everything
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clean cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Start again
.\start-dev.ps1
```

---

## 📚 MORE HELP

- **Ad blocking**: Read `docs/ADBLOCK.md`
- **Full README**: Read `README.md`
- **Project design**: Read `DESIGN.md`

---

*If you see a stale page after a config change, do a hard reload
(F12 → right-click refresh → Empty Cache and Hard Reload).*
