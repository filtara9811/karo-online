## Scope

Teen alag-alag kaam:

### 1. Admin → Legal page ka Rich Text Editor readability fix
Abhi `admin/legal` ke "Body (Rich Text Editor)" me text dark background pe dark color me render ho raha hai — kuch dikh hi nahi raha (screenshot me circle kiya hua area).

**Fix:** `src/components/admin/RichTextEditor.tsx` me editor surface ke colors theme tokens se bind karna:
- Editor background → light surface (`bg-background` ya white card) admin dark theme ke andar bhi
- Text color → high-contrast foreground
- Toolbar active state already gold hai, wahi rakhenge
- Placeholder, headings, lists, blockquote — sab ke liye explicit contrast

### 2. Customer Onboarding Screens (Splash / Intro slides) — admin se manage
Naya flow jab koi customer app pehli baar kholega:

```
App open → Intro Slides (1–N, swipeable) → "Get Started" → OTP login → Registration form → Home
```

**Admin side (`/admin/onboarding` — naya page):**
- Slides ki list (add / edit / delete / reorder)
- Har slide me: title, subtitle, media (image **ya** video **ya** Lottie/animation URL), CTA label
- Live preview
- "Skip allowed" toggle
- Storage: nayi `onboarding_slides` table (admin-only write, public read)

**Customer side:**
- `src/components/OnboardingCarousel.tsx` — full-screen swipeable carousel (framer-motion)
- `localStorage` flag `ko-onboarding-seen` — dubara nahi dikhega
- Slides na ho to flow skip
- Show only for unauthenticated users on first visit to `/quick`

### 3. Profile Edit ke liye OTP + Edit History tracking
Customer apni profile me jab koi field edit kare (specially phone number), to:

**Customer side (`src/routes/profile.tsx`):**
- "Edit" button → OTP modal pop up (current phone pe)
- OTP verify hone ke baad hi fields editable
- Phone change kare to **naye number pe bhi** OTP verify (dono verify ho to hi save)

**Audit/History:**
- Nayi table `customer_profile_audit`:
  ```
  id, customer_id, field_name, old_value, new_value, changed_at, verified_via_otp
  ```
- Profile update server function me trigger / explicit insert har changed field ke liye
- RLS: customer apna padh sake, admin sab padh sake

**Admin side (existing `/admin/view/$userId`):**
- Profile tab me naya section "Change History" — table form me purana value → naya value, timestamp
- Phone number ke liye specially highlighted (purana number strike-through, naya bold)

**Login flow already correct hai:** logout ke baad OTP+phone se login karne pe `auth.users` ka same UID resolve hota hai (deterministic UUID from phone), to profile auto-load ho jata hai. Confirm karke chhoduga.

## Files

**Create:**
- `src/components/admin/OnboardingManager.tsx`
- `src/routes/admin.onboarding.tsx`
- `src/components/OnboardingCarousel.tsx`
- `src/lib/profile-edit.functions.ts` (OTP-gated profile update + audit insert)
- Migration: `onboarding_slides`, `customer_profile_audit` tables + RLS

**Edit:**
- `src/components/admin/RichTextEditor.tsx` (contrast fix)
- `src/components/admin/AdminLayout.tsx` (Onboarding nav link)
- `src/routes/quick.tsx` ya `src/routes/index.tsx` (carousel gate)
- `src/routes/profile.tsx` (OTP-gated edit)
- `src/routes/admin.view.$userId.tsx` (Change History section)

## Confirm karne wali baatein

1. Onboarding slides per-slide media: image **+** optional video URL **+** optional Lottie URL — teeno fields rakhun ya ek "media URL" jisme kuch bhi daala ja sake?
2. Profile edit OTP: har field edit pe OTP, ya ek baar OTP karke 5 min ka "edit window" khol dun?
3. Edit history sab fields ka rakhun (name, gender, email, address, phone) ya sirf phone + email?
