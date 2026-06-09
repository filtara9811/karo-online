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
    enterApp();
    navigate({ to: "/quick" });
  };

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


      {/* Footer */}
      <footer className="mt-24 border-t border-white/5 bg-black/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="h-8 w-8 rounded-lg grid place-items-center font-bold text-[#1a1208]"
                style={{ background: "linear-gradient(180deg,#fff3c8,#d4af37 60%,#8b6508)" }}
              >
                K
              </span>
              <span className="font-display text-lg">
                <span className="ko-gold-text">Karo</span>Online
              </span>
            </div>
            <p className="text-sm text-white/55 leading-relaxed">
              India's premium hyperlocal marketplace — trusted vendors, instant service, secure payments.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link to="/features" className="hover:text-[#f5d97a]">Features</Link></li>
              <li><Link to="/for-customers" className="hover:text-[#f5d97a]">For Customers</Link></li>
              <li><Link to="/for-vendors" className="hover:text-[#f5d97a]">For Vendors</Link></li>
              <li><Link to="/pricing" className="hover:text-[#f5d97a]">Pricing</Link></li>
              <li><Link to="/download" className="hover:text-[#f5d97a]">Download App</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link to="/about" className="hover:text-[#f5d97a]">About</Link></li>
              <li><Link to="/contact" className="hover:text-[#f5d97a]">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-white/60">
              <li><Link to="/privacy-policy" className="hover:text-[#f5d97a]">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="hover:text-[#f5d97a]">Terms & Conditions</Link></li>
              <li><Link to="/refund-policy" className="hover:text-[#f5d97a]">Refund Policy</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-[#f5d97a]">Shipping Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/45">
            <span>© {new Date().getFullYear()} KaroOnline. All rights reserved.</span>
            <span>Made with ♥ in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
