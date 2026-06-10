import { createFileRoute } from "@tanstack/react-router";
import { Heart, Target, Sparkles, Building2, Mail, Globe, MapPin } from "lucide-react";
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

      {/* COMPANY INFO — PUBLIC */}
      <Section>
        <div className="ko-glass rounded-3xl p-8 md:p-12">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d97a] mb-3">Company Information</div>
          <h3 className="font-display text-3xl text-white mb-6">Filipra Private Limited</h3>
          <div className="grid gap-4 sm:grid-cols-2 text-white/80">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-[#d4af37] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/50">Service</div>
                <div>Hyperlocal Lead Generation Marketplace</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-[#d4af37] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/50">Website</div>
                <a href="https://karoonline.in" className="text-[#f5d97a] hover:underline">karoonline.in</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-[#d4af37] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/50">Email</div>
                <a href="mailto:Ashu@filipra.com" className="text-[#f5d97a] hover:underline">Ashu@filipra.com</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-[#d4af37] mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wider text-white/50">Address</div>
                <div>4988, First Floor, Gali Maliyan Chowk, Ahata Kidara, Sadar Bazar, Delhi</div>
              </div>
            </div>
          </div>
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
