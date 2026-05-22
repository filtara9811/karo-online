import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Smartphone, Globe, Download as DownloadIcon, ArrowRight } from "lucide-react";
import { MarketingLayout, enterApp } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader } from "@/components/marketing/sections";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download KaroOnline App" },
      { name: "description", content: "Get the KaroOnline app — available on Play Store and as web app. Free download, faster experience, push notifications." },
      { property: "og:title", content: "Download KaroOnline" },
      { property: "og:description", content: "Free app — Play Store + web. Faster, smoother, with push notifications." },
      { property: "og:url", content: "https://karoonline.in/download" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/download" }],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const navigate = useNavigate();
  const openWebApp = () => { enterApp(); navigate({ to: "/quick" }); };
  const playStoreUrl = "https://play.google.com/store/apps/details?id=in.karoonline.app";

  return (
    <MarketingLayout>
      <Section>
        <SectionHeader
          eyebrow="Download"
          title={<>Get <span className="ko-gold-text">KaroOnline</span> on your device.</>}
          subtitle="Choose how you want to use KaroOnline — mobile app or web. Both free, both premium."
        />

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Play Store */}
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ko-glass rounded-3xl p-8 group hover:border-[#d4af37]/50 transition-all"
          >
            <Smartphone className="h-10 w-10 text-[#f5d97a] mb-4" />
            <h3 className="font-display text-2xl text-white mb-2">Android App</h3>
            <p className="text-sm text-white/60 mb-6">
              Download from Google Play Store. Faster, with push notifications, and home-screen access.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl ko-gold-bar font-semibold">
              <DownloadIcon className="h-4 w-4" /> Get on Play Store
            </div>
          </a>

          {/* Web App */}
          <button
            onClick={openWebApp}
            className="ko-glass rounded-3xl p-8 text-left group hover:border-[#d4af37]/50 transition-all"
          >
            <Globe className="h-10 w-10 text-[#f5d97a] mb-4" />
            <h3 className="font-display text-2xl text-white mb-2">Web App</h3>
            <p className="text-sm text-white/60 mb-6">
              No download needed. Works in any modern browser — desktop or mobile. Add to home screen for app-like feel.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-white font-semibold group-hover:border-[#d4af37]/50">
              Open Web App <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-white/40 uppercase tracking-[0.22em]">
            iOS app coming soon
          </p>
        </div>
      </Section>
    </MarketingLayout>
  );
}
