import { createFileRoute } from "@tanstack/react-router";
import { Heart, Target, Sparkles } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader, FeatureCard } from "@/components/marketing/sections";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — KaroOnline" },
      { name: "description", content: "KaroOnline ka mission — har Indian customer ko trusted local vendors se jodna, ek premium experience ke saath." },
      { property: "og:title", content: "About — KaroOnline" },
      { property: "og:description", content: "Our mission is to connect every Indian with trusted local vendors." },
      { property: "og:url", content: "https://karoonline.in/about" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MarketingLayout>
      <Section className="!pt-20">
        <SectionHeader
          eyebrow="Our Story"
          title={<>We're building India's <span className="ko-gold-text">most trusted</span> local marketplace.</>}
          subtitle="KaroOnline ki shuruwat ek simple idea se hui — local vendors aur customers ke beech ka trust gap khatm karna."
        />
      </Section>

      <Section className="!pt-0">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={<Target className="h-5 w-5" />} title="Our Mission" desc="Every Indian neighbourhood deserves access to verified, fairly-priced, premium-quality local services." />
          <FeatureCard icon={<Heart className="h-5 w-5" />} title="Our Values" desc="Trust, transparency, and respect for both customers and the vendors who serve them." />
          <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Our Promise" desc="Premium experience at hyperlocal scale — from booking to delivery, every detail matters." />
        </div>
      </Section>

      <Section>
        <div className="ko-glass rounded-3xl p-8 md:p-12">
          <h3 className="font-display text-3xl text-white mb-4">From a local idea to a national platform</h3>
          <div className="space-y-4 text-white/70 leading-relaxed">
            <p>
              KaroOnline was born from a simple frustration — finding a trusted plumber, beautician, or shop owner in your own area was unreasonably hard. Recommendations were scattered, prices opaque, and quality unpredictable.
            </p>
            <p>
              We set out to fix that. Today, KaroOnline connects thousands of verified vendors across India with customers who value transparency, speed, and quality. Built mobile-first for the Indian market, with secure payments, live tracking and a premium experience throughout.
            </p>
            <p>
              We're just getting started — and we'd love for you to be part of the journey.
            </p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
