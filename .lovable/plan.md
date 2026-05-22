
# Admin CMS for Marketing Website ("Special Web")

Goal: हर marketing page (`/`, `/about`, `/features`, `/pricing`, `/for-vendors`, `/for-customers`, `/download`, `/contact` + new `/blog`) का A-to-Z control admin panel से। Save = instant live. SEO-friendly हर जगह।

## 1. New Admin Section: "Special Web"

`src/routes/admin.tsx` sidebar में नया group **"Special Web (Marketing Site)"** जिसके अंदर:

```
/admin/web                  → Dashboard (quick stats + last edits)
/admin/web/seo              → Per-page SEO (title, meta, keywords, og:image)
/admin/web/hero             → Hero banners (per page)
/admin/web/sections         → Reusable content blocks (text + image)
/admin/web/pricing          → Pricing plans manager
/admin/web/apk              → APK / Download manager (Vendor + Customer)
/admin/web/offers           → Top announcement bar
/admin/web/testimonials     → Reviews + brand logos
/admin/web/faqs             → FAQs (per page)
/admin/web/forms            → Custom form builder
/admin/web/forms/$id/submissions  → Submissions viewer + CSV export
/admin/web/blog             → Blog posts list
/admin/web/blog/$id         → Blog post editor (rich text)
/admin/web/media            → Image library (browse/upload/delete)
```

Sidebar में "Special Web" gold accent से highlight (premium feel)।

## 2. Database (Lovable Cloud)

Naya schema — सभी tables `is_active`, `sort_order`, `updated_at`, `updated_by`:

- **web_pages** — slug (`home`/`about`/...), seo_title, seo_description, seo_keywords (text[]), og_image_url, canonical_path, schema_json (JSON-LD)
- **web_hero_sections** — page_slug, eyebrow, title, subtitle, image_url, cta_label, cta_url, secondary_cta_label, secondary_cta_url, alignment
- **web_content_blocks** — page_slug, block_type (feature/text/image/cards/cta/stats), heading, body (markdown), image_url, items (jsonb array), sort_order
- **web_pricing_plans** — name, price, period, currency, description, features (text[]), cta_label, cta_url, is_featured, badge_label
- **web_apk_releases** — audience (`customer`/`vendor`), version, build_number, file_url (storage) **OR** external_url (Play Store/Drive), changelog, size_mb, released_at, is_current
- **web_offers** — title, body, cta_label, cta_url, bg_color, text_color, starts_at, ends_at, is_active (एक time पर सिर्फ active वाला top bar पर दिखे)
- **web_testimonials** — author_name, role/company, avatar_url, rating (1-5), quote, sort_order
- **web_brand_logos** — name, logo_url, link_url, sort_order
- **web_faqs** — page_slug, question, answer, sort_order
- **web_forms** — name, slug (e.g. `bulk-enquiry`), description, success_message, redirect_url, notify_emails (text[]), fields (jsonb: `[{key,label,type,required,options,placeholder,validation}]`)
- **web_form_submissions** — form_id, data (jsonb), source_page, ip_hash, user_agent (admin-only column), created_at
- **web_blog_posts** — slug, title, excerpt, cover_image_url, body_md, author_name, author_avatar, tags (text[]), seo_title, seo_description, og_image_url, published_at, reading_minutes, is_published
- **web_media_assets** — bucket_path, public_url, alt, tags (text[]), uploaded_by, file_size, mime

RLS:
- **Public SELECT** on all `web_*` rows where `is_active` / `is_published = true` (so marketing site = anon-friendly, no auth required).
- **Admin all** (insert/update/delete) via `is_admin_user(auth.uid())`.
- **web_form_submissions**: public INSERT (anyone can submit), admin SELECT/DELETE only.

Storage bucket: `marketing-media` (public, 20 MB image limit) + `marketing-apk` (public, 200 MB APK limit, admins-only write).

## 3. APK Manager (dual mode)

Each release row supports both:
- **Upload mode** → admin direct APK upload to `marketing-apk` bucket → auto-public URL
- **Link mode** → Play Store / Drive URL paste

`/download` page shows latest `is_current=true` row per audience (Customer + Vendor), with version, size, changelog, और दोनो primary buttons (Direct APK / Play Store) जो भी filled हो। Old versions archive में।

## 4. Custom Form Builder

Admin UI में drag-style field list with:
- Field types: text, email, phone, number, textarea, select, checkbox, radio, file, date
- Per field: required toggle, placeholder, options, regex validation, min/max length

Form embeds:
- Static slot on Contact page (default form)
- Shortcode `{{form:slug}}` in any content block → renders form inline
- Standalone route `/f/$slug` (shareable lead-gen link, SEO meta from form description)

Submissions screen: filterable table, CSV export, single-click view, optional email notification to `notify_emails` via existing notification triggers.

## 5. Offers Bar

Active offer row dिखेगा हर marketing page के top पर (sticky strip with close button, dismiss state in localStorage)। Schedule by `starts_at`/`ends_at` — backend filter, no cron needed (computed in server fn)।

## 6. Blog (SEO-strong)

- `/blog` — list page with cards (cover, title, excerpt, tags, date)
- `/blog/$slug` — article with cover image, markdown render (react-markdown + GFM), reading time, JSON-LD `BlogPosting` schema, og tags from post
- Tag filter `/blog?tag=...`
- Sitemap.xml auto-updates (server route reads `web_blog_posts` + static routes)

## 7. SEO Per Page

Admin SEO screen edits `web_pages` row per slug। हर marketing route का `head()` अब server fn से dynamic meta लोड करे (title, description, keywords, og:image, canonical, JSON-LD)। Default fallback meta बना रहे ताकि empty rows पर भी पेज valid रहे।

Keywords field admin को tag-pill UI में मिलेगा (suggested chips: "lead generation India", "vendor leads", "karoonline", etc.)।

## 8. Marketing Site Rewrite

Existing `src/routes/index.tsx`, `about.tsx`, `features.tsx`, `pricing.tsx`, `for-vendors.tsx`, `for-customers.tsx`, `download.tsx`, `contact.tsx` को refactor — sab कुछ DB से load. Static defaults तब use जब DB row खाली हो (first-run safety)।

- New shared component `<MarketingPage slug="..." />` जो: offers bar → hero → content blocks (ordered) → testimonials/logos (if any) → FAQs → CTA → footer
- Server fn `getMarketingPage(slug)` एक call में सब data return करे (page seo + hero + blocks + faqs)

## 9. Media Library

Reusable `<MediaPicker />` component हर image field पर — upload new या browse existing (`web_media_assets`)। हर upload पर alt text mandatory (SEO + a11y)।

## 10. Seed Data

Migration के साथ default rows insert — current website content को DB rows के रूप में डालेंगे ताकि पहले deploy पर भी सब कुछ वैसा ही दिखे जैसा अभी है, और admin बस edit करे।

---

## Technical Section (engineer-facing)

- **Routing**: TanStack file routes under `src/routes/admin.web.*.tsx` + child editors via `$id`. Public routes use new `<MarketingPage>` wrapper. `/blog`, `/blog.$slug`, `/f.$slug` new routes.
- **Data layer**: `src/lib/web-cms.functions.ts` exports `getMarketingPage`, `listBlogPosts`, `getBlogPost`, `getActiveOffer`, `getApkReleases`, `submitForm`, `getFormBySlug`. All `createServerFn`; reads use `supabaseAdmin` for anon-friendly SELECTs on `is_active=true` rows. Admin writes use `requireSupabaseAuth` + admin check middleware.
- **Loaders**: per-route loader → `queryClient.ensureQueryData` → `useSuspenseQuery` (TanStack Query default). `head()` reads seo row from loader-fetched data.
- **Storage**: two buckets via migration; signed URLs not needed (public read).
- **Markdown render**: install `react-markdown` + `remark-gfm` for blog + content blocks. Sanitize via default config (no raw HTML).
- **Form rendering**: dynamic field renderer keyed by `field.type`, validation via zod schema built from `fields` array at submit time. Honeypot field + simple per-IP rate limit (3 / minute) inside `submitForm`.
- **Sitemap**: server route at `src/routes/api/public/sitemap[.]xml.ts` listing static marketing routes + published blog slugs. `robots.txt` references it.
- **SEO defaults**: `__root.tsx` keeps sitewide title template (`%s — KaroOnline`); per-page `head()` returns only what's set (no og:image at root).
- **AppShell**: `MARKETING_EXACT` set widens to include `/blog`, `/blog/*`, `/f/*` so app chrome stays hidden.
- **Admin UI components**: reuse existing shadcn primitives. New shared admin components: `<MediaPicker>`, `<FormFieldsBuilder>`, `<MarkdownEditor>` (textarea + live preview), `<SeoFieldset>`.
- **Permissions**: existing `is_admin_user` is enough; no new role needed.
- **Migration order**: tables → RLS → triggers (updated_at) → buckets → seed.

## Out of scope (can add later)

- Multi-language
- Versioning / rollback (Instant live चुना)
- A/B testing
- Comments on blog
- Webhooks on form submit (notify_emails field already covers email)

After approval मैं sab कुछ migration + code एक shot में लागू कर दूंगा, current pages का look-and-feel exactly वैसा ही रखूंगा (sirf source DB से आएगा)।
