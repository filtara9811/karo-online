import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, TrendingUp, MessageSquare, Wallet, Bell, ShieldCheck, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader, FeatureCard } from "@/components/marketing/sections";

export const Route = createFileRoute("/for-vendors")({
  head: () => ({
    meta: [
      { title: "For Vendors — Grow your business with KaroOnline" },
      { name: "description", content: "Get qualified leads from your area. Free vendor onboarding. Manage orders, payments and customers — all in one app." },
      { property: "og:title", content: "For Vendors — KaroOnline" },
      { property: "og:description", content: "Get qualified leads from your area. Free onboarding. Manage everything in one app." },
      { property: "og:url", content: "https://karoonline.in/for-vendors" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/for-vendors" }],
  }),
  component: ForVendorsPage,
});

function ForVendorsPage() {
  return (
    <MarketingLayout>
      <Section>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 text-[#f5d97a] text-xs uppercase tracking-[0.22em] mb-5">
            For Vendors
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-white leading-tight">
            Grow your local business — <span className="ko-gold-text">without ads.</span>
          </h1>
          <p className="mt-5 text-lg text-white/65">
            Get qualified leads from customers in your area. Manage quotes, orders & payments in one beautiful app. No monthly fees to start.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/vendor/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold ko-gold-bar shadow-[0_8px_32px_-8px_rgba(212,175,55,0.7)]"
            >
              Become a Vendor <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-white/15 text-white hover:border-[#d4af37]/50 hover:bg-white/5"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <SectionHeader
          eyebrow="Why Vendors Choose Us"
          title={<>Tools to <span className="ko-gold-text">win more business.</span></>}
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Briefcase className="h-5 w-5" />} title="Real Leads" desc="Customers ready to buy — not just browsers. Only pay for leads you accept." />
          <FeatureCard icon={<TrendingUp className="h-5 w-5" />} title="Grow Your Reach" desc="Show up to customers in a 10–30km radius. Featured placements available." />
          <FeatureCard icon={<MessageSquare className="h-5 w-5" />} title="Direct Chat" desc="Talk to customers right inside the app — photos, voice notes, all included." />
          <FeatureCard icon={<Wallet className="h-5 w-5" />} title="Fast Payouts" desc="Cashfree-powered settlements. Daily/weekly auto-transfers to your bank." />
          <FeatureCard icon={<Bell className="h-5 w-5" />} title="Instant Lead Alerts" desc="Push notifications the moment a customer requests your service." />
          <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Verified Trust Badge" desc="KYC verification gives customers confidence — and you more conversions." />
        </div>
      </Section>
    </MarketingLayout>
  );
}
