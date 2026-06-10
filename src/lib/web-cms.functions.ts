import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============ PUBLIC READS (anon-safe via supabaseAdmin scoped by is_active) ============

async function cmsClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getMarketingPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await cmsClient();
    const slug = data.slug;
    const [pageR, heroR, blocksR, faqsR, offerR] = await Promise.all([
      supabaseAdmin.from("web_pages").select("*").eq("slug", slug).eq("is_active", true).maybeSingle(),
      supabaseAdmin.from("web_hero_sections").select("*").eq("page_slug", slug).eq("is_active", true).maybeSingle(),
      supabaseAdmin.from("web_content_blocks").select("*").eq("page_slug", slug).eq("is_active", true).order("sort_order"),
      supabaseAdmin.from("web_faqs").select("*").eq("page_slug", slug).eq("is_active", true).order("sort_order"),
      supabaseAdmin
        .from("web_offers")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      page: pageR.data,
      hero: heroR.data,
      blocks: blocksR.data ?? [],
      faqs: faqsR.data ?? [],
      offer: offerR.data,
    };
  });

export const getPricingPlans = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await cmsClient();
  const { data } = await supabaseAdmin
    .from("web_pricing_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

export const getApkReleases = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await cmsClient();
  const { data } = await supabaseAdmin
    .from("web_apk_releases")
    .select("*")
    .eq("is_active", true)
    .order("released_at", { ascending: false });
  return data ?? [];
});

export const listBlogPosts = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await cmsClient();
  const { data } = await supabaseAdmin
    .from("web_blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, cover_image_alt, tags, author_name, published_at, reading_minutes")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  return data ?? [];
});

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await cmsClient();
    const { data: post } = await supabaseAdmin
      .from("web_blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    return post;
  });

export const getTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await cmsClient();
  const { data } = await supabaseAdmin
    .from("web_testimonials")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

export const getBrandLogos = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await cmsClient();
  const { data } = await supabaseAdmin
    .from("web_brand_logos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

export const getFormBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await cmsClient();
    const { data: form } = await supabaseAdmin
      .from("web_forms")
      .select("id, slug, name, description, fields, submit_label, success_message, redirect_url, seo_title, seo_description")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    return form;
  });

// ============ PUBLIC WRITE: submit a form ============

export const submitWebForm = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; data: Record<string, unknown>; source_page?: string; honeypot?: string }) =>
    z
      .object({
        slug: z.string().min(1).max(64),
        data: z.record(z.string().max(128), z.unknown()),
        source_page: z.string().max(200).optional(),
        honeypot: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await cmsClient();
    if (data.honeypot && data.honeypot.length > 0) return { ok: true }; // bot
    const { data: form } = await supabaseAdmin
      .from("web_forms")
      .select("id, fields")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!form) throw new Error("Form not found");

    // Trim every string value to a sane length
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.data)) {
      if (typeof v === "string") cleaned[k] = v.slice(0, 5000);
      else cleaned[k] = v;
    }

    const { error } = await supabaseAdmin.from("web_form_submissions").insert([{
      form_id: form.id,
      data: cleaned as never,
      source_page: data.source_page ?? null,
    }]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
