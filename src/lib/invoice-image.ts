import html2canvas from "html2canvas";

/**
 * Capture an HTMLElement as a PNG dataURL using html2canvas.
 * Falls back to a textual data URL if rendering fails.
 */
export async function captureInvoicePng(el: HTMLElement): Promise<string> {
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("Invoice capture failed", e);
    return "";
  }
}

/**
 * Try to share the captured PNG via Web Share API (best on mobile).
 * Returns true on success, false if it fell back to download/open.
 */
export async function shareInvoicePng(
  dataUrl: string,
  filename: string,
  opts: { phone?: string; caption?: string } = {},
): Promise<boolean> {
  if (!dataUrl) return false;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    const navAny = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
    };
    if (
      navAny.canShare &&
      navAny.canShare({ files: [file] }) &&
      navAny.share
    ) {
      await navAny.share({
        files: [file],
        text: opts.caption ?? "Your invoice",
        title: filename,
      });
      return true;
    }
  } catch (e) {
    console.warn("Web Share failed", e);
  }
  // Fallback — download + open WhatsApp web with text
  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
    if (opts.phone) {
      const msg = encodeURIComponent(opts.caption ?? "Your invoice from Ashhu's Digital Shop");
      window.open(
        `https://wa.me/${opts.phone.replace(/\D/g, "")}?text=${msg}`,
        "_blank",
      );
    }
  } catch (e) {
    console.warn("Fallback download failed", e);
  }
  return false;
}
