import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, MessageSquare, CreditCard, Star, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { MarketingLayout, enterApp } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader, FeatureCard } from "@/components/marketing/sections";

export const Route = createFileRoute("/for-customers")({
  head: () => ({
    meta: [
      { title: "For Customers — KaroOnline" },
      { name: "description", content: "Book trusted vendors in seconds. Live quotes, secure payments, real-time tracking. Free for customers." },
      { property: "og:title", content: "For Customers — KaroOnline" },
      { property: "og:description", content: "Book trusted vendors in seconds. Free for customers." },
      { property: "og:url", content: "https://karoonline.in/for-customers" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/for-customers" }],
  }),
  component: ForCustomersPage,
});

function ForCustomersPage() {
  const navigate = useNavigate();
  const open = () => { enterApp(); navigate({ to: "/quick" }); };
  return (
    <MarketingLayout>
      <Section>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 text-[#f5d97a] text-xs uppercase tracking-[0.22em] mb-5">
            For Customers
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-white leading-tight">
            Book trusted vendors — <span className="ko-gold-text">in seconds.</span>
          </h1>
          <p className="mt-5 text-lg text-white/65">
            Compare live quotes from nearby vendors, pay securely, and track your order in real time. Free, always.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={open}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold ko-gold-bar shadow-[0_8px_32px_-8px_rgba(212,175,55,0.7)]"
            >
              Open Web App <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <SectionHeader
          eyebrow="How It Works"
          title={<>Three steps. <span className="ko-gold-text">That's it.</span></>}
        />
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={<Search className="h-5 w-5" />} title="1. Tell us what you need" desc="Service or product — type, snap a photo, or use voice. Set your area." />
          <FeatureCard icon={<MessageSquare className="h-5 w-5" />} title="2. Receive live quotes" desc="Nearby verified vendors bid within minutes. Chat to clarify details." />
          <FeatureCard icon={<CreditCard className="h-5 w-5" />} title="3. Pay & track" desc="Secure escrow payment. Track vendor live till job is done. Rate the experience." />
        </div>
      </Section>

      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={<Star className="h-5 w-5" />} title="Rated & Reviewed" desc="Every vendor carries public ratings from real customers." />
          <FeatureCard icon={<Clock className="h-5 w-5" />} title="Fast Response" desc="Median first-bid time under 3 minutes during business hours." />
          <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="100% Refund Guarantee" desc="Service not as promised? Full refund, no questions asked." />
        </div>
      </Section>
    </MarketingLayout>
  );
}
