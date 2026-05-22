import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Globe, Image as ImageIcon, LayoutGrid, BadgePercent, Star, MessageSquare,
  HelpCircle, Smartphone, ClipboardList, BookOpen, FileText, ArrowRight,
} from "lucide-react";
import { AdminLayout, PageHeader, GoldCard } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/web/")({
  component: () => (
    <AdminLayout>
      <WebHub />
    </AdminLayout>
  ),
});

const TILES = [
  { to: "/admin/web/seo", label: "SEO per Page", icon: Globe, desc: "Title, meta, keywords, OG image" },
  { to: "/admin/web/hero", label: "Hero Banners", icon: ImageIcon, desc: "Per-page hero with CTA" },
  { to: "/admin/web/sections", label: "Content Blocks", icon: LayoutGrid, desc: "Features, text, image blocks" },
  { to: "/admin/web/pricing", label: "Pricing Plans", icon: FileText, desc: "Manage plan cards" },
  { to: "/admin/web/apk", label: "APK / Downloads", icon: Smartphone, desc: "Upload APK or paste Play Store link" },
  { to: "/admin/web/offers", label: "Offer Bar", icon: BadgePercent, desc: "Sitewide top banner" },
  { to: "/admin/web/testimonials", label: "Testimonials", icon: Star, desc: "Reviews & ratings" },
  { to: "/admin/web/faqs", label: "FAQs", icon: HelpCircle, desc: "Per-page FAQs" },
  { to: "/admin/web/forms", label: "Custom Forms", icon: ClipboardList, desc: "Lead capture & submissions" },
  { to: "/admin/web/blog", label: "Blog", icon: BookOpen, desc: "SEO articles, rich content" },
  { to: "/admin/web/media", label: "Media Library", icon: MessageSquare, desc: "Browse uploaded assets" },
];

function WebHub() {
  return (
    <div>
      <PageHeader
        title="Special Web · Marketing Site"
        subtitle="A-to-Z control of your public website — instant live publish"
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to}>
            <GoldCard className="p-5 hover:border-[#d4af37]/60 transition group cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-10 w-10 rounded-xl grid place-items-center text-[#1a1208]"
                  style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg text-[#fff8dc]">{t.label}</h3>
                <ArrowRight className="ml-auto h-4 w-4 text-[#d4af37]/60 group-hover:text-[#fff8dc] group-hover:translate-x-1 transition" />
              </div>
              <p className="text-xs text-[#f5d97a]/60">{t.desc}</p>
            </GoldCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
