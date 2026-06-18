## Brand Asset Update

Replace the previously generated gold map-pin logo with the user's actual uploaded icon, and use the second uploaded image (full "Karo Online" map illustration) as the default cover/poster background.

### Steps

1. **Upload both images as CDN assets** via `lovable-assets create`:
   - `/mnt/user-uploads/ChatGPT_Image_Jun_17_2026_04_25_13_PM.png` → `src/assets/karo-logo.png.asset.json` (overwrites the previously generated logo pointer)
   - `/mnt/user-uploads/ChatGPT_Image_Jun_17_2026_03_45_58_PM.png` → `src/assets/karo-cover.png.asset.json` (new)

2. **Wire the real logo** everywhere the prior `karo-logo` asset is referenced:
   - QR poster center watermark (`QrPosterSheet.tsx`)
   - Public landing page header (`s.$code.tsx`)
   - Any other component importing `@/assets/karo-logo.png.asset.json`

3. **Wire the cover image** as the default poster background / fallback shop image:
   - `QrPosterSheet.tsx` — use `karo-cover` as the default slot-0 background when the merchant has not uploaded a shop photo
   - Landing page (`s.$code.tsx`) — use as hero fallback when no merchant media is configured

4. No DB / business-logic changes. Only swap asset pointers + import references. Verify with `tsc --noEmit`.
