import { Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AppPrefsProvider } from "@/hooks/use-app-prefs";
import { CartProvider } from "@/hooks/use-cart";

import appCss from "../styles.css?url";

function NotFoundComponent() {
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "transparent" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "Karo Online — Luxury Registration" },
      { name: "description", content: "Join Karo Online — premium wine & gold registration experience." },
      { name: "author", content: "Karo Online" },
      { property: "og:title", content: "Karo Online — Luxury Registration" },
      { property: "og:description", content: "Join Karo Online — premium wine & gold registration experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
  return (
    <AppPrefsProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </AppPrefsProvider>
  );
}
