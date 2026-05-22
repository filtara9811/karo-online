import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Section, SectionHeader } from "@/components/marketing/sections";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — KaroOnline" },
      { name: "description", content: "Get in touch with KaroOnline. Customer support, vendor partnerships, business enquiries — we'd love to hear from you." },
      { property: "og:title", content: "Contact — KaroOnline" },
      { property: "og:description", content: "Get in touch with the KaroOnline team." },
      { property: "og:url", content: "https://karoonline.in/contact" },
    ],
    links: [{ rel: "canonical", href: "https://karoonline.in/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    // Open user's mail client as a reliable, no-backend fallback.
    const subject = encodeURIComponent(`KaroOnline enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name}\n${form.email}`);
    window.location.href = `mailto:support@karoonline.in?subject=${subject}&body=${body}`;
    setTimeout(() => {
      toast.success("Opening your email app…");
      setSubmitting(false);
    }, 500);
  };

  return (
    <MarketingLayout>
      <Section>
        <SectionHeader
          eyebrow="Contact"
          title={<>Let's <span className="ko-gold-text">talk.</span></>}
          subtitle="Customer support, vendor partnerships, press, or just saying hi — drop us a line."
        />

        <div className="grid gap-8 md:grid-cols-5 max-w-5xl mx-auto">
          {/* Info */}
          <div className="md:col-span-2 space-y-5">
            <div className="ko-glass rounded-2xl p-5">
              <Mail className="h-5 w-5 text-[#f5d97a] mb-2" />
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">Email</div>
              <a href="mailto:support@karoonline.in" className="text-white hover:text-[#f5d97a]">
                support@karoonline.in
              </a>
            </div>
            <div className="ko-glass rounded-2xl p-5">
              <Phone className="h-5 w-5 text-[#f5d97a] mb-2" />
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">Phone</div>
              <a href="tel:+919999999999" className="text-white hover:text-[#f5d97a]">
                +91 99999 99999
              </a>
            </div>
            <div className="ko-glass rounded-2xl p-5">
              <MapPin className="h-5 w-5 text-[#f5d97a] mb-2" />
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">Address</div>
              <div className="text-white">India</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="md:col-span-3 ko-glass rounded-3xl p-7 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.18em] text-white/55 mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-[#d4af37]/50"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.18em] text-white/55 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-[#d4af37]/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.18em] text-white/55 mb-2">Message</label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-[#d4af37]/50 resize-none"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold ko-gold-bar disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Opening…" : "Send Message"}
            </button>
          </form>
        </div>
      </Section>
    </MarketingLayout>
  );
}
