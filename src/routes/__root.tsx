import { Link, createRootRoute, HeadContent, Scripts, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { AppPrefsProvider } from "@/hooks/use-app-prefs";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { registerPwaServiceWorker } from "@/lib/register-sw";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/index") {
      navigate({ to: "/", replace: true });
    }
  }, [location.pathname, navigate]);

  if (location.pathname === "/index") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="font-display text-4xl text-gold-gradient mb-3">Karo Online</h1>
          <p className="text-sm text-muted-foreground">Loading your experience…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-wine rounded-2xl p-10">
        <h1 className="text-7xl font-display text-gold-gradient">404</h1>
        <h2 className="mt-4 text-xl font-display text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gold-bar px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#e8e0d0" },
      { name: "background-color", content: "#FFFFFF" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Karo Online" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "Karo Online" },
      { name: "google-site-verification", content: "hniAuF5wdWybu0IilGD4x3UcgNcaNCeXHtIJTkBt0gU" },
      { title: "KaroOnline.In" },
      { name: "description", content: "Join Karo Online — premium wine & gold registration experience." },
      { name: "author", content: "Karo Online" },
      { property: "og:title", content: "KaroOnline.In" },
      { property: "og:description", content: "Join Karo Online — premium wine & gold registration experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "KaroOnline.In" },
      { name: "twitter:description", content: "Join Karo Online — premium wine & gold registration experience." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/veNcIAhiKOS4Hz56IgbEUhjzRg53/social-images/social-1779039597318-1000420561.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/veNcIAhiKOS4Hz56IgbEUhjzRg53/social-images/social-1779039597318-1000420561.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    // Canonical hostname: keep installed PWA on a single origin so Chrome
    // never shows the "in-app browser" bar when navigating between
    // www.karoonline.in and karoonline.in.
    try {
      const h = window.location.hostname;
      if (h === "www.karoonline.in") {
        const url = new URL(window.location.href);
        url.hostname = "karoonline.in";
        window.location.replace(url.toString());
        return;
      }
    } catch {
      /* noop */
    }
    registerPwaServiceWorker();
  }, []);
  return (
    <AppPrefsProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell />
          <Toaster position="top-center" richColors closeButton />
        </CartProvider>
      </AuthProvider>
    </AppPrefsProvider>
  );
}
