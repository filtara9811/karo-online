/** Build a deep link to a vendor shop (optionally with a product) and trigger native share. */
export function buildShopDeepLink(shopId: string, productId?: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://karoonline.in";
  const params = new URLSearchParams({ shopId });
  if (productId) params.set("productId", productId);
  return `${origin}/vendors?${params.toString()}`;
}

export async function shareLink(opts: {
  title: string;
  text?: string;
  url: string;
}): Promise<"shared" | "copied" | "failed"> {
  const data: ShareData = { title: opts.title, text: opts.text, url: opts.url };
  try {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      await nav.share(data);
      return "shared";
    }
  } catch {
    /* user cancelled or failed — fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(opts.url);
    return "copied";
  } catch {
    return "failed";
  }
}
