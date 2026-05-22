import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { MarketingLayout, enterApp } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader } from "@/components/marketing/sections";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — KaroOnline" },
      { name: "description", content: "KaroOnline is free for customers. Vendors pay only for qualified leads. No setup fees, no monthly minimums." },
      { property: "og:title", content: "Pricing — KaroOnline" },
      { property: "og:description", content: "Free for customers. Pay-per-lead for vendors." },
      { property: "og:url", content: "https://karoonline.in/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/pricing" }],
  }),
  component: PricingPage,
});

const PLANS = [
  {
    name: "Customer",
    price: "Free",
    sub: "Forever, for everyone.",
    features: [
      "Unlimited service requests",
      "Real-time vendor bids",
      "Secure payments via escrow",
      "Live order tracking",
      "Chat with vendors",
      "Full refund protection",
    ],
    cta: "Open Web App",
    href: "/quick" as const,
    accent: false,
  },
  {
    name: "Vendor — Starter",
    price: "₹0",
    sub: "Setup fee. Pay-per-lead.",
    features: [
      "Free vendor onboarding",
      "Receive unlimited leads",
      "Pay only for accepted leads",
      "Full shop & catalog setup",
      "In-app chat with customers",
      "Order & payment dashboard",
    ],
    cta: "Become a Vendor",
    href: "/vendor/register" as const,
    accent: true,
  },
  {
    name: "Vendor — Pro",
    price: "Custom",
    sub: "For high-volume businesses.",
    features: [
      "Priority lead distribution",
      "Featured shop placement",
      "Multi-staff accounts",
      "Advanced analytics",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/contact" as const,
    accent: false,
  },
];

function PricingPage() {
  const navigate = useNavigate();
  return (
    <MarketingLayout>
      <Section>
        <SectionHeader
          eyebrow="Pricing"
          title={<>Simple, <span className="ko-gold-text">honest pricing.</span></>}
          subtitle="Free for customers. Vendors pay only when they win business — no monthly fees, no surprises."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`ko-glass rounded-3xl p-7 flex flex-col ${p.accent ? "border-[#d4af37]/50 shadow-[0_0_60px_-20px_rgba(212,175,55,0.5)]" : ""}`}
            >
              {p.accent && (
                <div className="self-start mb-3 px-2.5 py-1 rounded-full bg-[#d4af37]/15 text-[#f5d97a] text-[10px] uppercase tracking-[0.22em]">
                  Most Popular
                </div>
              )}
              <div className="text-sm text-white/55 uppercase tracking-[0.18em]">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-5xl ko-gold-text">{p.price}</span>
              </div>
              <p className="text-sm text-white/55 mt-1">{p.sub}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                    <Check className="h-4 w-4 text-[#d4af37] mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  if (p.href === "/quick") enterApp();
                  navigate({ to: p.href });
                }}
                className={`mt-7 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition ${
                  p.accent
                    ? "ko-gold-bar"
                    : "border border-white/15 text-white hover:border-[#d4af37]/50 hover:bg-white/5"
                }`}
              >
                {p.cta} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Section>
    </MarketingLayout>
  );
}
