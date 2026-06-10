import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Zap, Shield, MapPin, Users, Star, ArrowRight, CheckCircle2,
  Smartphone, Wallet, Bell, Download,
} from "lucide-react";
import { MarketingLayout, enterApp } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader, FeatureCard } from "@/components/marketing/sections";

const OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/b6c58009-aed3-4f10-8b1d-c9bf371df617";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KaroOnline — India's Premium Hyperlocal Marketplace" },
      {
        name: "description",
        content:
          "Connect with trusted local vendors instantly. Quick services, secure payments, real-time tracking. Download KaroOnline app or use on web.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://karoonline.in/" },
      { property: "og:title", content: "KaroOnline — India's Premium Hyperlocal Marketplace" },
      {
        property: "og:description",
        content: "Trusted vendors. Instant service. Secure payments. Download the app or use on web.",
      },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "KaroOnline" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setChecking(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("web") === "1") {
      try { window.localStorage.removeItem("ko-entered-app"); } catch {}
      setChecking(false);
      return;
    }

    // Detect installed PWA / Capacitor APK / iOS standalone
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches ||
      (window.navigator as any).standalone === true;
    const isCapacitor = !!(window as any).Capacitor;
    const isWebView = /wv|KaroOnlineApp/i.test(navigator.userAgent);

    // Only auto-redirect when running as an installed app (PWA / Capacitor / WebView).
    // In ALL browsers (mobile + desktop), show the marketing site with the floating
    // phone frame so the website sits behind and the app preview sits in front.
    if (isStandalone || isCapacitor || isWebView) {
      enterApp();
      navigate({ to: "/quick", replace: true });
      return;
    }

    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0a0a] text-white">
        <div className="text-center">
          <div className="font-display text-3xl ko-gold-text">KaroOnline</div>
          <div className="text-xs text-white/40 mt-2 tracking-widest uppercase">Loading…</div>
        </div>
      </div>
    );
  }

  const handleOpenApp = () => {
    // Open the in-page floating phone preview instead of leaving the website.
    try { window.dispatchEvent(new Event("ko-open-phone")); } catch {}
  };

  return (
    <MarketingLayout>
      {/* HERO */}
      <section className="relative ko-aurora overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 md:pt-28 pb-20 md:pb-32 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 text-[#f5d97a] text-xs uppercase tracking-[0.22em] mb-6">
            <Star className="h-3 w-3 fill-current" />
            India's Premium Hyperlocal Marketplace
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[1.05] max-w-4xl">
            Local vendors. <br />
            <span className="ko-gold-text">Premium service.</span>{" "}
            <span className="text-white">Delivered fast.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-white/65 max-w-2xl leading-relaxed">
            Find trusted vendors near you — repairs, beauty, cleaning, products & more.
            Real-time tracking, secure payments, transparent pricing.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenApp}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold ko-gold-bar shadow-[0_8px_32px_-8px_rgba(212,175,55,0.7)] hover:opacity-95 transition"
            >
              Open Web App <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/download"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-white/15 text-white hover:border-[#d4af37]/50 hover:bg-white/5 transition"
            >
              <Download className="h-4 w-4" /> Download App
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/50">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> 10,000+ verified vendors</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> Secure payments</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> 4.9★ rated</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <Section>
        <SectionHeader
          eyebrow="Why KaroOnline"
          title={<>Built for India. <span className="ko-gold-text">Crafted for trust.</span></>}
          subtitle="Everything you need to discover, book and pay local vendors — in one premium experience."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Zap className="h-5 w-5" />} title="Instant Quick Service" desc="Tap once. Nearby vendors bid in real-time. Pick the best, book in seconds." />
          <FeatureCard icon={<Shield className="h-5 w-5" />} title="Secure Payments" desc="Cashfree-powered escrow. Pay only when work is done. Full refund protection." />
          <FeatureCard icon={<MapPin className="h-5 w-5" />} title="Live Tracking" desc="Real-time vendor location, ETA & order status — from booking to completion." />
          <FeatureCard icon={<Users className="h-5 w-5" />} title="Verified Vendors" desc="KYC-verified, rated & reviewed by your neighbours. No surprises." />
          <FeatureCard icon={<Wallet className="h-5 w-5" />} title="Transparent Pricing" desc="See item-by-item quotes before you commit. No hidden fees, ever." />
          <FeatureCard icon={<Bell className="h-5 w-5" />} title="Smart Notifications" desc="Get bid updates, chat messages & order alerts instantly via push." />
        </div>
      </Section>

      {/* DUAL CTA */}
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/for-customers"
            className="ko-glass rounded-3xl p-8 md:p-10 group hover:border-[#d4af37]/50 transition-all"
          >
            <div className="text-xs uppercase tracking-[0.22em] text-[#f5d97a] mb-3">For Customers</div>
            <h3 className="font-display text-3xl md:text-4xl text-white mb-3">Need a service?</h3>
            <p className="text-white/60 mb-6">Find a verified vendor near you in seconds.</p>
            <div className="inline-flex items-center gap-2 text-white group-hover:text-[#f5d97a] transition">
              Learn more <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
          <Link
            to="/for-vendors"
            className="ko-glass rounded-3xl p-8 md:p-10 group hover:border-[#d4af37]/50 transition-all"
          >
            <div className="text-xs uppercase tracking-[0.22em] text-[#f5d97a] mb-3">For Vendors</div>
            <h3 className="font-display text-3xl md:text-4xl text-white mb-3">Grow your business.</h3>
            <p className="text-white/60 mb-6">Get qualified leads from your area. Zero monthly fees to start.</p>
            <div className="inline-flex items-center gap-2 text-white group-hover:text-[#f5d97a] transition">
              Become a vendor <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </Section>

      {/* DOWNLOAD STRIP */}
      <Section className="!py-12">
        <div className="ko-glass rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Smartphone className="h-10 w-10 text-[#f5d97a]" />
            <div>
              <h3 className="font-display text-2xl md:text-3xl text-white">Get the mobile app</h3>
              <p className="text-white/55 text-sm mt-1">Faster, smoother, with push notifications & offline support.</p>
            </div>
          </div>
          <Link
            to="/download"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold ko-gold-bar"
          >
            <Download className="h-4 w-4" /> Download
          </Link>
        </div>
      </Section>

      {/* PUBLIC COMPANY STRIP */}
      <Section className="!py-10">
        <div className="ko-glass rounded-3xl p-6 md:p-8 text-center space-y-3">
          <p className="font-display text-xl md:text-2xl text-white">
            Powered by <span className="ko-gold-text">Filipra Private Limited</span> — India's Hyperlocal Service Marketplace
          </p>
          <p className="text-white/70 text-sm md:text-base max-w-3xl mx-auto">
            <span className="text-[#f5d97a] font-semibold">Our Services:</span> Lead Generation for Plumbers, Electricians, Carpenters, Painters and other local service providers.
          </p>
          <Link to="/about" className="inline-flex items-center gap-2 text-[#f5d97a] hover:text-white text-sm font-semibold">
            About the company <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>
    </MarketingLayout>
  );
}
