import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-amber-200 bg-gradient-to-b from-white to-[#fff8e8]">
      <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col items-center gap-3 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold">
          <Link to="/privacy-policy" className="text-amber-800 hover:text-amber-600 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          <span className="text-amber-300">•</span>
          <Link to="/terms-and-conditions" className="text-amber-800 hover:text-amber-600 underline-offset-2 hover:underline">
            Terms &amp; Conditions
          </Link>
          <span className="text-amber-300">•</span>
          <Link to="/refund-policy" className="text-amber-800 hover:text-amber-600 underline-offset-2 hover:underline">
            Refund Policy
          </Link>
          <span className="text-amber-300">•</span>
          <Link to="/shipping-policy" className="text-amber-800 hover:text-amber-600 underline-offset-2 hover:underline">
            Shipping Policy
          </Link>
        </nav>
        <p
          className="text-xs font-semibold tracking-wide text-amber-900"
          style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.04em" }}
        >
          Powered by <span className="font-bold">Filipra Private Limited</span>
        </p>
      </div>
    </footer>
  );
}
