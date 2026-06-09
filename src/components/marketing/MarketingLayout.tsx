import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Download, ArrowRight } from "lucide-react";
import { FloatingPhoneMockup } from "@/components/marketing/FloatingPhoneMockup";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/features", label: "Features" },
  { to: "/for-vendors", label: "For Vendors" },
  { to: "/for-customers", label: "For Customers" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function enterApp() {
  try {
    window.localStorage.setItem("ko-entered-app", "true");
  } catch {}
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const goToApp = () => {
    // Open the floating phone frame instead of navigating away from the website.
    try { window.dispatchEvent(new Event("ko-open-phone")); } catch {}
  };
  // navigate is intentionally unused now (kept import for future use)
  void navigate;

  return (
    <div className="ko-marketing min-h-screen text-white" style={{ background: "#0a0a0a" }}>
      <style>{`
        .ko-marketing { font-family: 'Inter', system-ui, sans-serif; }
        .ko-marketing h1, .ko-marketing h2, .ko-marketing h3 {
          font-family: 'Cormorant Garamond', 'Playfair Display', serif;
          letter-spacing: 0.005em;
        }
        .ko-gold-text {
          background: linear-gradient(180deg, #fff3c8 0%, #f5d97a 45%, #d4af37 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .ko-gold-bar {
          background: linear-gradient(180deg, #fff3c8 0%, #f5d97a 50%, #d4af37 100%);
          color: #1a1208;
        }
        .ko-glass {
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(212,175,55,0.18);
          backdrop-filter: blur(12px);
        }
        .ko-aurora::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(800px 400px at 10% -10%, rgba(212,175,55,0.18), transparent 60%),
            radial-gradient(700px 400px at 90% 0%, rgba(26,26,46,0.9), transparent 60%),
            radial-gradient(600px 500px at 50% 100%, rgba(212,175,55,0.10), transparent 70%);
          pointer-events: none;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 ko-glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span
              className="h-9 w-9 rounded-xl grid place-items-center font-bold text-[#1a1208]"
              style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
            >
              K
            </span>
            <span className="font-display text-xl tracking-wide">
              <span className="ko-gold-text">Karo</span>
              <span className="text-white/90">Online</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="px-3 py-2 text-sm rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "px-3 py-2 text-sm rounded-lg text-white bg-white/5" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/download"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-white/80 border border-white/10 hover:border-[#d4af37]/50 hover:text-white transition"
            >
              <Download className="h-4 w-4" />
              Download
            </Link>
            <button
              onClick={goToApp}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ko-gold-bar shadow-[0_4px_24px_-6px_rgba(212,175,55,0.6)] hover:opacity-95 transition"
            >
              Open App <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
              className="lg:hidden h-10 w-10 grid place-items-center rounded-lg border border-white/10 text-white"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-white/5 bg-black/95">
            <div className="px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/5"
                  activeOptions={{ exact: n.to === "/" }}
                  activeProps={{ className: "px-3 py-2.5 rounded-lg text-white bg-white/5" }}
                >
                  {n.label}
                </Link>
              ))}
              <button
                onClick={goToApp}
                className="mt-2 px-4 py-2.5 rounded-lg font-semibold ko-gold-bar"
              >
                Open App
              </button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <FloatingPhoneMockup />


      {/* Footer — Filipra-inspired layout */}
      <footer className="mt-24 border-t border-white/5" style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #1a0612 100%)" }}>
        {/* Top contact strip */}
        <div className="border-b border-white/5" style={{ background: "rgba(120,20,60,0.35)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
            <a href="mailto:Ashu@filipra.com" className="inline-flex items-center gap-2 text-white/85 hover:text-[#f5d97a]">
              <span className="text-[#f5d97a]">✉</span> Ashu@filipra.com
            </a>
            <a href="https://wa.me/919599202558" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/85 hover:text-[#f5d97a]">
              <span className="text-[#f5d97a]">⌬</span> WhatsApp +91 95992 02558
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="h-10 w-10 rounded-xl grid place-items-center font-bold text-[#1a1208]"
                style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
              >
                K
              </span>
              <div>
                <div className="font-display text-xl ko-gold-text leading-none">KaroOnline</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/55 mt-1">
                  Powered by Filipra Private Limited
                </div>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              India's premium hyperlocal marketplace — trusted vendors, instant service, secure payments. Built with the quiet craftsmanship of a heritage house.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.22em] text-[#f5d97a] uppercase mb-4">Navigate</h4>
            <ul className="space-y-2.5 text-sm text-white/75">
              <li><Link to="/" className="hover:text-[#f5d97a]">Home</Link></li>
              <li><Link to="/about" className="hover:text-[#f5d97a]">About Us</Link></li>
              <li><Link to="/features" className="hover:text-[#f5d97a]">Features</Link></li>
              <li><Link to="/for-vendors" className="hover:text-[#f5d97a]">For Vendors</Link></li>
              <li><Link to="/for-customers" className="hover:text-[#f5d97a]">For Customers</Link></li>
              <li><Link to="/pricing" className="hover:text-[#f5d97a]">Pricing</Link></li>
              <li><Link to="/contact" className="hover:text-[#f5d97a]">Contact</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-[#f5d97a]">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="hover:text-[#f5d97a]">Terms &amp; Conditions</Link></li>
              <li><Link to="/refund-policy" className="hover:text-[#f5d97a]">Refund Policy</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-[#f5d97a]">Shipping Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.22em] text-[#f5d97a] uppercase mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex gap-3">
                <span className="text-[#f5d97a] mt-0.5">📍</span>
                <span>4988, First Floor, Gali Maliyan Chowk,<br />Ahata Kidara, Sadar Bazar, Delhi, India</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#f5d97a]">✉</span>
                <a href="mailto:Ashu@filipra.com" className="hover:text-[#f5d97a]">Ashu@filipra.com</a>
              </li>
              <li className="flex gap-3">
                <span className="text-[#f5d97a]">⌬</span>
                <a href="https://wa.me/919599202558" target="_blank" rel="noreferrer" className="hover:text-[#f5d97a]">
                  WhatsApp +91 95992 02558
                </a>
              </li>
              <li className="flex gap-3">
                <span className="text-[#f5d97a]">🌐</span>
                <a href="https://filipra.com" target="_blank" rel="noreferrer" className="hover:text-[#f5d97a]">filipra.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/55">
            <span>© {new Date().getFullYear()} KaroOnline · Powered by Filipra Private Limited. All rights reserved.</span>
            <span>Made with ♥ in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
