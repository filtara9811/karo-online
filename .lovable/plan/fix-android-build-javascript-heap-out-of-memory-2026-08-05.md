# Fix: Android build "JavaScript heap out of memory"

## Kya hua
GitHub Actions ka "Build web bundle" step Node ki default heap limit (~2 GB) par pahunch kar crash ho gaya —
log me `Mark-Compact 2008.3 MB` ke baad `FATAL ERROR: ... heap out of memory` aur `exit code 134`.
Project bada hai (200+ routes), isliye Vite build ko zyada memory chahiye.

Note: workflow ka naam `build-android.yml` nahi, `.github/workflows/main.yml` hai — fix wahi jayega.

## Fix (ek hi file me)
`.github/workflows/main.yml` → "Build web bundle" step:

- `NODE_OPTIONS: --max-old-space-size=8192` add karna (GitHub runner me 16 GB RAM hai, 4096 se bada margin safe hai)
- Same env var ko "Capacitor sync (android)" step par bhi rakhna, kyunki wo bhi Node chalata hai
- Build step se pehle ek chhota diagnostics line (available memory print) taaki agli baar failure ka source turant dikhe

```yaml
      - name: Build web bundle
        run: bun run build
        env:
          NODE_ENV: production
          NODE_OPTIONS: "--max-old-space-size=8192"
```

## Agar phir bhi fail ho (fallback, tabhi lagayenge)
- `vite.config.ts` me `build.sourcemap: false` confirm/force karna (sourcemaps hi sabse zyada heap khaate hain)
- Vite ki minification `esbuild` par rakhna (default) — terser nahi

Pehle sirf memory-limit fix; wahi 99% cases me kaafi hota hai.

## Test
Aap Actions → "Build Android App" → Run workflow (variant `oneqr`) chalayein.
Build web bundle green hone ke baad `karo-oneqr-playstore-aab` artifact milega.
