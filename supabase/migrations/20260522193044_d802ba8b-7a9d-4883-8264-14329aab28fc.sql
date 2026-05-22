
CREATE OR REPLACE FUNCTION public.web_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.web_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  page_title TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  seo_keywords TEXT[] NOT NULL DEFAULT '{}',
  og_image_url TEXT,
  canonical_path TEXT,
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active pages" ON public.web_pages FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all pages" ON public.web_pages FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_pages_updated BEFORE UPDATE ON public.web_pages FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_hero_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL UNIQUE,
  eyebrow TEXT,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  image_url TEXT,
  image_alt TEXT,
  cta_label TEXT,
  cta_url TEXT,
  secondary_cta_label TEXT,
  secondary_cta_url TEXT,
  alignment TEXT NOT NULL DEFAULT 'center',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_hero_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active hero" ON public.web_hero_sections FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all hero" ON public.web_hero_sections FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_hero_updated BEFORE UPDATE ON public.web_hero_sections FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'text',
  heading TEXT,
  subheading TEXT,
  body TEXT,
  image_url TEXT,
  image_alt TEXT,
  cta_label TEXT,
  cta_url TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  background TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_web_blocks_page ON public.web_content_blocks(page_slug, sort_order);
ALTER TABLE public.web_content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active blocks" ON public.web_content_blocks FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all blocks" ON public.web_content_blocks FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_blocks_updated BEFORE UPDATE ON public.web_content_blocks FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT '0',
  period TEXT NOT NULL DEFAULT 'month',
  currency TEXT NOT NULL DEFAULT '₹',
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  cta_label TEXT NOT NULL DEFAULT 'Get Started',
  cta_url TEXT NOT NULL DEFAULT '/quick',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  badge_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active plans" ON public.web_pricing_plans FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all plans" ON public.web_pricing_plans FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_plans_updated BEFORE UPDATE ON public.web_pricing_plans FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_apk_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL CHECK (audience IN ('customer','vendor')),
  version TEXT NOT NULL,
  build_number INTEGER,
  file_url TEXT,
  external_url TEXT,
  play_store_url TEXT,
  changelog TEXT,
  size_mb NUMERIC,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_apk_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active apk" ON public.web_apk_releases FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all apk" ON public.web_apk_releases FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_apk_updated BEFORE UPDATE ON public.web_apk_releases FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_url TEXT,
  bg_color TEXT NOT NULL DEFAULT '#d4af37',
  text_color TEXT NOT NULL DEFAULT '#0a0a0a',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active offers" ON public.web_offers FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all offers" ON public.web_offers FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_offers_updated BEFORE UPDATE ON public.web_offers FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  avatar_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  quote TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active testimonials" ON public.web_testimonials FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all testimonials" ON public.web_testimonials FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_testimonials_updated BEFORE UPDATE ON public.web_testimonials FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_brand_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_brand_logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active logos" ON public.web_brand_logos FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all logos" ON public.web_brand_logos FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_logos_updated BEFORE UPDATE ON public.web_brand_logos FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL DEFAULT 'home',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_web_faqs_page ON public.web_faqs(page_slug, sort_order);
ALTER TABLE public.web_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active faqs" ON public.web_faqs FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all faqs" ON public.web_faqs FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_faqs_updated BEFORE UPDATE ON public.web_faqs FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  submit_label TEXT NOT NULL DEFAULT 'Submit',
  success_message TEXT NOT NULL DEFAULT 'Thanks! We will get back to you soon.',
  redirect_url TEXT,
  notify_emails TEXT[] NOT NULL DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read active forms" ON public.web_forms FOR SELECT USING (is_active = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all forms" ON public.web_forms FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_forms_updated BEFORE UPDATE ON public.web_forms FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.web_forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_page TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_web_subs_form ON public.web_form_submissions(form_id, created_at DESC);
ALTER TABLE public.web_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit" ON public.web_form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "admin read subs" ON public.web_form_submissions FOR SELECT USING (is_admin_user(auth.uid()));
CREATE POLICY "admin delete subs" ON public.web_form_submissions FOR DELETE USING (is_admin_user(auth.uid()));

CREATE TABLE public.web_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  cover_image_alt TEXT,
  body_md TEXT NOT NULL DEFAULT '',
  author_name TEXT,
  author_avatar TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] NOT NULL DEFAULT '{}',
  og_image_url TEXT,
  reading_minutes INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_web_blog_pub ON public.web_blog_posts(is_published, published_at DESC);
ALTER TABLE public.web_blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read published" ON public.web_blog_posts FOR SELECT USING (is_published = true OR is_admin_user(auth.uid()));
CREATE POLICY "admin all blog" ON public.web_blog_posts FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE TRIGGER trg_web_blog_updated BEFORE UPDATE ON public.web_blog_posts FOR EACH ROW EXECUTE FUNCTION public.web_set_updated_at();

CREATE TABLE public.web_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL DEFAULT 'marketing-media',
  bucket_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  mime TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.web_media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read media" ON public.web_media_assets FOR SELECT USING (true);
CREATE POLICY "admin all media" ON public.web_media_assets FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('marketing-media', 'marketing-media', true, 20971520, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']),
  ('marketing-apk', 'marketing-apk', true, 209715200, ARRAY['application/vnd.android.package-archive','application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read marketing media" ON storage.objects FOR SELECT USING (bucket_id IN ('marketing-media','marketing-apk'));
CREATE POLICY "admin write marketing media" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('marketing-media','marketing-apk') AND is_admin_user(auth.uid()));
CREATE POLICY "admin update marketing media" ON storage.objects FOR UPDATE USING (bucket_id IN ('marketing-media','marketing-apk') AND is_admin_user(auth.uid()));
CREATE POLICY "admin delete marketing media" ON storage.objects FOR DELETE USING (bucket_id IN ('marketing-media','marketing-apk') AND is_admin_user(auth.uid()));

-- ============ SEED ============
INSERT INTO public.web_pages (slug, page_title, seo_title, seo_description, seo_keywords) VALUES
  ('home', 'Home', 'KaroOnline — India''s Premium Lead Marketplace', 'Connect with verified vendors instantly. Post leads, get quotes, save time and money.', ARRAY['lead generation india','vendor leads','karoonline','service marketplace','quick leads','verified vendors']),
  ('about', 'About', 'About KaroOnline — Built for Bharat', 'Learn the story behind KaroOnline and our mission to power India''s service economy.', ARRAY['about karoonline','indian startup','lead platform india']),
  ('features', 'Features', 'Features — KaroOnline', 'Smart matching, verified vendors, real-time chat, secure payments and more.', ARRAY['features','smart matching','vendor verification','lead management']),
  ('pricing', 'Pricing', 'Simple Pricing — KaroOnline', 'Transparent pay-per-lead pricing. No setup fees, no monthly lock-in.', ARRAY['pricing','pay per lead','vendor pricing','lead cost']),
  ('for-vendors', 'For Vendors', 'For Vendors — Grow Your Business with KaroOnline', 'Get qualified leads daily. Pay only for accepted leads. Manage everything from one dashboard.', ARRAY['vendor app','business leads','grow business','vendor dashboard']),
  ('for-customers', 'For Customers', 'For Customers — Find Verified Service Pros', 'Post any service request and get instant quotes from verified local vendors.', ARRAY['find vendors','service near me','verified pros','quick quotes']),
  ('download', 'Download', 'Download the KaroOnline App', 'Get the customer or vendor app on Play Store or download the APK directly.', ARRAY['download app','apk download','vendor app','customer app','play store']),
  ('contact', 'Contact', 'Contact KaroOnline — We''re Here to Help', 'Reach our support team for any questions, partnerships or feedback.', ARRAY['contact','support','help','partnerships']),
  ('blog', 'Blog', 'KaroOnline Blog — Tips, News & Stories', 'Insights for vendors and customers. Growth tips, success stories and product updates.', ARRAY['blog','tips','vendor growth','success stories']);

INSERT INTO public.web_hero_sections (page_slug, eyebrow, title, subtitle, cta_label, cta_url, secondary_cta_label, secondary_cta_url) VALUES
  ('home', 'India''s Premium Lead Marketplace', 'Get the right vendor in minutes — not days', 'Post a quick request, watch verified vendors compete with live quotes, and pick the best fit. Pay nothing to post.', 'Post a Lead', '/quick', 'Become a Vendor', '/vendor-onboarding'),
  ('about', 'Our Story', 'Built for Bharat. Built for trust.', 'KaroOnline was born from a simple frustration — finding a reliable vendor shouldn''t take a week of phone calls.', 'Learn More', '#story', NULL, NULL),
  ('features', 'Everything you need', 'A premium platform for serious service business', 'Smart matching, vendor verification, real-time chat, secure payments — all in one app.', 'Try It Now', '/quick', NULL, NULL),
  ('pricing', 'Simple, transparent', 'Pay only for what you use', 'No setup fees. No monthly lock-in. Just per-lead pricing that grows with your business.', 'View Plans', '#plans', NULL, NULL),
  ('for-vendors', 'For Vendors', 'Win more business with KaroOnline', 'Get qualified leads daily, manage quotes, chat with customers — all from one premium dashboard.', 'Become a Vendor', '/vendor-onboarding', 'Vendor App', '/download'),
  ('for-customers', 'For Customers', 'Skip the search. Get quotes in minutes.', 'Post your need, get matched with 5 verified pros instantly, and choose the best one.', 'Post a Request', '/quick', NULL, NULL),
  ('download', 'Get the App', 'KaroOnline on your phone', 'Faster, smoother, and offline-ready. Download the customer or vendor app now.', NULL, NULL, NULL, NULL),
  ('contact', 'We''re here to help', 'Talk to our team', 'Questions, partnership ideas, or feedback — drop us a line and we''ll respond within one business day.', NULL, NULL, NULL, NULL),
  ('blog', 'KaroOnline Blog', 'Stories, tips and updates', 'Growth playbooks for vendors, smart buying tips for customers, and the latest from our team.', NULL, NULL, NULL, NULL);

INSERT INTO public.web_content_blocks (page_slug, block_type, heading, body, items, sort_order) VALUES
  ('home', 'cards', 'Why KaroOnline', NULL, '[
    {"title":"Verified Vendors","body":"Every vendor goes through KYC and document checks before they can quote.","icon":"shield-check"},
    {"title":"Instant Quotes","body":"Get 5 quotes within minutes of posting your request.","icon":"zap"},
    {"title":"Pay Per Lead","body":"Vendors only pay for accepted leads. No monthly fees.","icon":"coins"},
    {"title":"Premium Support","body":"Real humans, available 7 days a week to help both sides.","icon":"heart"}
  ]'::jsonb, 1),
  ('features', 'cards', 'Built for both sides', NULL, '[
    {"title":"Smart Matching","body":"AI-powered matching by category, distance and rating."},
    {"title":"KYC Verified","body":"Aadhaar, PAN and GST verification for serious vendors."},
    {"title":"Real-time Chat","body":"Built-in messaging with image sharing."},
    {"title":"Secure Payments","body":"Coin wallet + UPI/cards via Cashfree."},
    {"title":"Lead History","body":"Full audit trail for every interaction."},
    {"title":"Premium Dashboard","body":"Insights, earnings and analytics in one place."}
  ]'::jsonb, 1),
  ('about', 'text', 'Our mission', 'We are building the most trusted way to find and hire service vendors in India. Premium experience, transparent pricing, and a community that respects both sides.', '[]'::jsonb, 1);

INSERT INTO public.web_pricing_plans (name, price, period, description, features, is_featured, badge_label, sort_order) VALUES
  ('Starter', 'Free', 'forever', 'Perfect to try the platform', ARRAY['Post unlimited leads','5 vendor quotes per lead','Real-time chat','Customer support'], false, NULL, 1),
  ('Vendor Pro', 'Pay per lead', '', 'For serious service businesses', ARRAY['Accept unlimited leads','Pay only for accepted leads','Premium vendor badge','Priority support','Advanced analytics','KYC verification included'], true, 'Most Popular', 2),
  ('Enterprise', 'Custom', 'month', 'For multi-location businesses', ARRAY['Everything in Vendor Pro','Multi-team dashboard','Custom integrations','Dedicated account manager','SLA guarantee'], false, NULL, 3);

INSERT INTO public.web_apk_releases (audience, version, play_store_url, changelog, is_current) VALUES
  ('customer', '1.0.0', NULL, 'Initial release — post leads, get quotes, chat with vendors.', true),
  ('vendor', '1.0.0', NULL, 'Initial release — accept leads, manage quotes, track earnings.', true);

INSERT INTO public.web_faqs (page_slug, question, answer, sort_order) VALUES
  ('home', 'Is it really free to post a lead?', 'Yes. Customers pay nothing to post requests or chat with vendors. Vendors only pay for leads they accept.', 1),
  ('home', 'How are vendors verified?', 'Every vendor completes Aadhaar, PAN and (where applicable) GST verification before they can quote on leads.', 2),
  ('home', 'How fast will I get quotes?', 'Most leads receive 3-5 quotes within 10 minutes of posting.', 3),
  ('pricing', 'Are there hidden fees?', 'No. Vendors pay a transparent per-lead coin cost shown before acceptance. Customers pay nothing.', 1),
  ('pricing', 'Can I cancel anytime?', 'Yes. There is no lock-in. Vendors can stop accepting leads at any time.', 2);

INSERT INTO public.web_forms (slug, name, description, fields, submit_label, success_message) VALUES
  ('contact', 'Contact Us', 'Drop us a line and we will respond within one business day.',
   '[
     {"key":"name","label":"Your Name","type":"text","required":true,"placeholder":"Full name"},
     {"key":"phone","label":"Phone","type":"phone","required":true,"placeholder":"10-digit mobile"},
     {"key":"email","label":"Email","type":"email","required":false,"placeholder":"you@example.com"},
     {"key":"subject","label":"Subject","type":"select","required":true,"options":["General Enquiry","Vendor Partnership","Support","Feedback","Other"]},
     {"key":"message","label":"Message","type":"textarea","required":true,"placeholder":"Tell us more..."}
   ]'::jsonb,
   'Send Message', 'Thanks! Our team will get in touch within one business day.');

INSERT INTO public.web_offers (title, body, cta_label, cta_url, is_active) VALUES
  ('🎉 Launch Offer', 'Get 100 bonus coins on your first vendor signup', 'Become a Vendor', '/vendor-onboarding', false);
