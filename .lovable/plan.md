Plan: My Listing image upload and customer visibility fix

1. Add a proper native-style media picker on My Listing
- Replace direct hidden file click for cover and profile photo with a bottom sheet.
- Sheet will show two clear choices: Camera and Gallery.
- Camera input will use `capture="environment"` for cover/business photos and camera flow for profile image.
- Gallery input will open the phone gallery.
- Add uploading, cancel, retry-safe states and clear success/error messages.

2. Fix upload failure for cover/profile pictures
- Stop using a likely wrong/restricted upload path/bucket behavior from this screen.
- Use one consistent vendor media upload helper that compresses images, creates safe unique paths, uploads to the existing storage bucket, and stores the public URL.
- Update both vendor fields when profile photo changes:
  - `profile_photo_url` for My Listing UI
  - `avatar_url` for customer-facing vendor lists/chat/orders
- Update cover image in `cover_image_url`.
- Show the real backend error in toast instead of generic “Upload failed”, so future issues are visible.

3. Fix onboarding/shop image uploads and multiple gallery images
- Replace the current onboarding `ImageSlot` behavior that only creates temporary `blob:` preview URLs and never uploads real files.
- Reuse the camera/gallery picker for Shop Front, Interior, Owner/Profile, Gallery/KYC-style images.
- Upload each selected file immediately and save real URLs into the draft.
- Allow multiple gallery-style image selection where needed and store uploaded URLs in `gallery_urls`.

4. Make uploaded vendor pictures appear for customers after request/accept
- Update customer-facing reads to prefer the new uploaded profile photo:
  - quick vendor map/list
  - customer order/vendor list after vendor accepts
  - customer chat accepted-vendor header
  - digital shop/vendor browsing cards
- Include `cover_image_url` where customer screens need background/cover photos.
- Keep fallbacks only when the vendor has not uploaded an image.

5. Verify
- Run typecheck after changes.
- Use Playwright on mobile viewport to verify:
  - My Listing cover picker opens Camera/Gallery sheet
  - profile picker opens Camera/Gallery sheet
  - selected image updates preview after upload path is triggered
  - customer/vendor data mapping uses uploaded image fields
- No schema change planned unless storage permissions prove to be the root cause; if storage policy is missing, I will add only the minimal storage RLS migration needed for authenticated vendor uploads.