import { createFileRoute } from "@tanstack/react-router";
import { Zap, Shield, MapPin, Users, Wallet, Bell, MessageSquare, Star, Package, Truck, Receipt, BarChart3 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader, FeatureCard } from "@/components/marketing/sections";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — KaroOnline" },
      { name: "description", content: "Quick service booking, secure payments, live tracking, vendor chat, ratings & reviews. Everything KaroOnline offers." },
      { property: "og:title", content: "Features — KaroOnline" },
      { property: "og:description", content: "Quick service, secure payments, live tracking, vendor chat and more." },
      { property: "og:url", content: "https://karoonline.in/features" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/features" }],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  { icon: <Zap className="h-5 w-5" />, title: "Quick Service", desc: "One-tap booking. Multiple nearby vendors send live quotes within minutes." },
  { icon: <Shield className="h-5 w-5" />, title: "Secure Payments", desc: "Cashfree escrow with full refund protection. Pay only when satisfied." },
  { icon: <MapPin className="h-5 w-5" />, title: "Live Tracking", desc: "Real-time vendor GPS, ETA estimates and order status updates." },
  { icon: <Users className="h-5 w-5" />, title: "Verified Vendors", desc: "KYC-verified businesses with public ratings and customer reviews." },
  { icon: <Wallet className="h-5 w-5" />, title: "Transparent Pricing", desc: "Itemized quotes before booking. No surprises, no hidden fees." },
  { icon: <Bell className="h-5 w-5" />, title: "Push Notifications", desc: "Bid alerts, chat pings, order updates — never miss a thing." },
  { icon: <MessageSquare className="h-5 w-5" />, title: "In-App Chat", desc: "Direct messaging with vendors — share photos, voice notes, locations." },
  { icon: <Star className="h-5 w-5" />, title: "Ratings & Reviews", desc: "Rate every order. Help your neighbours pick the best vendors." },
  { icon: <Package className="h-5 w-5" />, title: "Product Catalogs", desc: "Browse vendor shops, see prices, add to cart and check out." },
  { icon: <Truck className="h-5 w-5" />, title: "Doorstep Delivery", desc: "Many vendors offer home delivery — tracked and insured." },
  { icon: <Receipt className="h-5 w-5" />, title: "Digital Invoices", desc: "Auto-generated invoices for every order — saved to your history." },
  { icon: <BarChart3 className="h-5 w-5" />, title: "Vendor Dashboard", desc: "Vendors get powerful tools: leads, orders, payments, analytics." },
];

function FeaturesPage() {
  return (
    <MarketingLayout>
      <Section>
        <SectionHeader
          eyebrow="Features"
          title={<>Everything you need, <span className="ko-gold-text">nothing you don't.</span></>}
          subtitle="A complete platform for customers, vendors and the trust between them."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </Section>
    </MarketingLayout>
  );
}
