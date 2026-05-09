import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, QrCode, Store, FileText, Plus, Trash2, Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

// ============= TYPES =============
export type LocationPayload = {
  lat: number;
  lng: number;
  label?: string;
  live?: boolean;
  expiresAt?: number; // epoch ms
};
export type QrPayPayload = {
  upiId: string;
  payeeName?: string;
  amount: number;
  note?: string;
  qrDataUrl: string;
  upiLink: string;
};
export type ShopCardPayload = {
  name: string;
  url: string;
  logo?: string;
};
export type InvoiceItem = { name: string; qty: number; price: number };
export type InvoicePayload = {
  number: string;
  customer: string;
  items: InvoiceItem[];
  total: number;
  pdfDataUrl: string;
};

// ============= SHELL =============
function SheetShell({ onClose, children, height = "auto" }: { onClose: () => void; children: React.ReactNode; height?: string }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/50 z-[60]" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90vh", height }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300 my-3 flex-shrink-0" />
        {children}
      </motion.div>
    </>
  );
}

// ============= LOCATION SHEET =============
export function LocationSheet({ onClose, onSend }: { onClose: () => void; onSend: (loc: LocationPayload) => void }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendCurrent = () => {
    setLoading(true); setErr(null);
    if (!navigator.geolocation) { setErr("Geolocation not supported"); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSend({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Current location" });
        setLoading(false); onClose();
      },
      (e) => { setErr(e.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const sendLive = () => {
    setLoading(true); setErr(null);
    if (!navigator.geolocation) { setErr("Geolocation not supported"); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSend({
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          label: "Live location (15 min)", live: true,
          expiresAt: Date.now() + 15 * 60 * 1000,
        });
        setLoading(false); onClose();
      },
      (e) => { setErr(e.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <SheetShell onClose={onClose}>
      <div className="px-5 pb-6">
        <h3 className="font-display font-bold text-base mb-1">Share location</h3>
        <p className="text-xs text-gray-500 mb-4">WhatsApp jaisa — current ya live location bhejo.</p>
        <button onClick={sendCurrent} disabled={loading} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 active:bg-emerald-100 mb-2 disabled:opacity-50">
          <span className="h-11 w-11 rounded-full bg-emerald-500 grid place-items-center"><MapPin className="h-5 w-5 text-white" /></span>
          <div className="text-left">
            <p className="font-bold text-sm text-emerald-900">Send current location</p>
            <p className="text-[11px] text-emerald-700">One-time location pin</p>
          </div>
        </button>
        <button onClick={sendLive} disabled={loading} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-blue-50 active:bg-blue-100 disabled:opacity-50">
          <span className="h-11 w-11 rounded-full bg-blue-500 grid place-items-center"><Navigation className="h-5 w-5 text-white" /></span>
          <div className="text-left">
            <p className="font-bold text-sm text-blue-900">Share live location</p>
            <p className="text-[11px] text-blue-700">Auto-update for 15 minutes</p>
          </div>
        </button>
        {err && <p className="text-xs text-red-500 mt-3">{err}</p>}
        {loading && <p className="text-xs text-gray-500 mt-3">📍 Fetching location…</p>}
      </div>
    </SheetShell>
  );
}

// ============= QR PAY SHEET =============
export function QrPaySheet({ onClose, onSend }: { onClose: () => void; onSend: (q: QrPayPayload) => void }) {
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [savedUpi, setSavedUpi] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"setup" | "amount">("setup");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStep("setup"); return; }
      const { data } = await supabase.from("customers").select("upi_id, name").eq("user_id", user.id).maybeSingle();
      if (data?.upi_id) {
        setSavedUpi(data.upi_id); setUpiId(data.upi_id);
        setPayeeName(data.name || "");
        setStep("amount");
      }
    })();
  }, []);

  const saveUpi = async () => {
    if (!upiId.includes("@")) { alert("Valid UPI ID required (e.g. name@bank)"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("customers").update({ upi_id: upiId.trim() }).eq("user_id", user.id);
    }
    setSavedUpi(upiId.trim()); setStep("amount"); setBusy(false);
  };

  const generate = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { alert("Enter valid amount"); return; }
    setBusy(true);
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || "Payee")}&am=${amt.toFixed(2)}&cu=INR${note ? `&tn=${encodeURIComponent(note)}` : ""}`;
    const qrDataUrl = await QRCode.toDataURL(upiLink, { width: 320, margin: 1, color: { dark: "#1f2937", light: "#ffffff" } });
    onSend({ upiId, payeeName, amount: amt, note, qrDataUrl, upiLink });
    setBusy(false); onClose();
  };

  return (
    <SheetShell onClose={onClose}>
      <div className="px-5 pb-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">UPI QR Pay</h3>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        {step === "setup" ? (
          <>
            <p className="text-xs text-gray-500 mb-3">Apni UPI ID save karein (sirf ek baar).</p>
            <label className="text-[11px] font-bold text-gray-600">UPI ID *</label>
            <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@bank"
              className="w-full mt-1 mb-3 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-500" />
            <label className="text-[11px] font-bold text-gray-600">Payee Name (optional)</label>
            <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Your name"
              className="w-full mt-1 mb-4 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-500" />
            <button onClick={saveUpi} disabled={busy} className="w-full py-3 rounded-full bg-amber-500 text-white font-bold text-sm active:scale-95 disabled:opacity-50">
              {busy ? "Saving…" : "Save & Continue"}
            </button>
          </>
        ) : (
          <>
            <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-amber-700 font-semibold">Paying to</p>
                <p className="text-xs font-bold text-amber-900">{savedUpi}</p>
              </div>
              <button onClick={() => setStep("setup")} className="text-[10px] font-semibold text-amber-700 underline">Change</button>
            </div>
            <label className="text-[11px] font-bold text-gray-600">Amount (₹) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500"
              className="w-full mt-1 mb-3 p-4 rounded-xl border border-gray-200 text-2xl font-bold outline-none focus:border-amber-500" autoFocus />
            <label className="text-[11px] font-bold text-gray-600">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Service payment"
              className="w-full mt-1 mb-4 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-500" />
            <button onClick={generate} disabled={busy} className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm active:scale-95 disabled:opacity-50">
              {busy ? "Generating…" : `Generate QR for ₹${amount || "0"}`}
            </button>
          </>
        )}
      </div>
    </SheetShell>
  );
}

// ============= SHOP SHARE SHEET =============
export function ShopSheet({ onClose, onSend }: { onClose: () => void; onSend: (s: ShopCardPayload) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [savedShop, setSavedShop] = useState<ShopCardPayload | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("customers").select("shop_name, shop_url, shop_logo_url, name").eq("user_id", user.id).maybeSingle();
      if (data?.shop_name && data?.shop_url) {
        const s = { name: data.shop_name, url: data.shop_url, logo: data.shop_logo_url || undefined };
        setSavedShop(s); setName(s.name); setUrl(s.url); setLogo(s.logo || "");
      } else if (data?.name) { setName(`${data.name}'s Shop`); }
    })();
  }, []);

  const save = async () => {
    if (!name.trim() || !url.trim()) { alert("Shop name & URL required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("customers").update({ shop_name: name.trim(), shop_url: url.trim(), shop_logo_url: logo.trim() || null }).eq("user_id", user.id);
    }
    onSend({ name: name.trim(), url: url.trim(), logo: logo.trim() || undefined });
    onClose();
  };

  const sendSaved = () => { if (savedShop) { onSend(savedShop); onClose(); } };

  return (
    <SheetShell onClose={onClose}>
      <div className="px-5 pb-6">
        <h3 className="font-display font-bold text-base mb-3">Share Digital Shop</h3>
        {savedShop && (
          <div className="mb-4 p-3 rounded-2xl bg-orange-50 border border-orange-200 flex items-center gap-3">
            {savedShop.logo ? <img src={savedShop.logo} className="h-12 w-12 rounded-xl object-cover" alt="" /> : <Store className="h-10 w-10 text-orange-500" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{savedShop.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{savedShop.url}</p>
            </div>
            <button onClick={sendSaved} className="px-3 py-2 rounded-full bg-orange-500 text-white text-xs font-bold">Send</button>
          </div>
        )}
        <p className="text-[11px] text-gray-500 mb-2">{savedShop ? "Or update details:" : "Setup your shop card:"}</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop name"
          className="w-full mb-2 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourshop.com"
          className="w-full mb-2 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500" />
        <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="Logo URL (optional)"
          className="w-full mb-4 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-500" />
        <button onClick={save} className="w-full py-3 rounded-full bg-orange-500 text-white font-bold text-sm active:scale-95">Save & Share</button>
      </div>
    </SheetShell>
  );
}

// ============= INVOICE SHEET =============
export function InvoiceSheet({ onClose, onSend, vendorName }: { onClose: () => void; onSend: (inv: InvoicePayload) => void; vendorName: string }) {
  const [customer, setCustomer] = useState(vendorName);
  const [items, setItems] = useState<InvoiceItem[]>([{ name: "", qty: 1, price: 0 }]);
  const [busy, setBusy] = useState(false);
  const [businessName, setBusinessName] = useState("My Business");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("customers").select("shop_name, name").eq("user_id", user.id).maybeSingle();
      if (data?.shop_name) setBusinessName(data.shop_name);
      else if (data?.name) setBusinessName(data.name);
    })();
  }, []);

  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  const addItem = () => setItems([...items, { name: "", qty: 1, price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<InvoiceItem>) =>
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const generate = async () => {
    const valid = items.filter(it => it.name.trim() && it.qty > 0 && it.price >= 0);
    if (!valid.length) { alert("Add at least one item"); return; }
    setBusy(true);
    const number = `INV-${Date.now().toString().slice(-6)}`;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    // Header
    doc.setFillColor(217, 119, 6); doc.rect(0, 0, W, 70, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text(businessName, 40, 42);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("QUOTATION / INVOICE", 40, 60);
    // Meta
    doc.setTextColor(30);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${number}`, 40, 100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 116);
    doc.text(`Bill to: ${customer}`, 40, 132);
    // Table header
    let y = 170;
    doc.setFillColor(245, 245, 245); doc.rect(40, y - 16, W - 80, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Item", 50, y); doc.text("Qty", 320, y); doc.text("Price", 380, y); doc.text("Total", 470, y);
    doc.setFont("helvetica", "normal");
    y += 24;
    valid.forEach(it => {
      doc.text(it.name.slice(0, 40), 50, y);
      doc.text(String(it.qty), 320, y);
      doc.text(`Rs.${it.price.toFixed(2)}`, 380, y);
      doc.text(`Rs.${(it.qty * it.price).toFixed(2)}`, 470, y);
      y += 20;
    });
    // Total
    y += 10; doc.setDrawColor(200); doc.line(40, y, W - 40, y); y += 20;
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("Grand Total:", 380, y); doc.text(`Rs.${total.toFixed(2)}`, 470, y);
    // Footer
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(120);
    doc.text("Thank you for your business!", 40, 800);
    const pdfDataUrl = doc.output("datauristring");
    onSend({ number, customer, items: valid, total, pdfDataUrl });
    setBusy(false); onClose();
  };

  return (
    <SheetShell onClose={onClose} height="85vh">
      <div className="px-5 pb-6 overflow-y-auto flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">New Invoice / Quotation</h3>
          <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <label className="text-[11px] font-bold text-gray-600">Bill to</label>
        <input value={customer} onChange={(e) => setCustomer(e.target.value)}
          className="w-full mt-1 mb-4 p-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-500" />
        <p className="text-[11px] font-bold text-gray-600 mb-2">Items</p>
        <div className="space-y-2 mb-3">
          {items.map((it, i) => (
            <div key={i} className="p-3 rounded-xl border border-gray-200 bg-gray-50">
              <input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="Item name"
                className="w-full mb-2 p-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-amber-500" />
              <div className="flex gap-2 items-center">
                <input type="number" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 0 })} placeholder="Qty"
                  className="w-16 p-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-amber-500" />
                <input type="number" value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) || 0 })} placeholder="Price"
                  className="flex-1 p-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-amber-500" />
                <span className="text-xs font-bold text-gray-700 w-20 text-right">₹{(it.qty * it.price).toFixed(0)}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="h-7 w-7 grid place-items-center rounded-full bg-red-100"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-600 mb-4 flex items-center justify-center gap-1">
          <Plus className="h-3.5 w-3.5" /> Add item
        </button>
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 mb-4">
          <span className="font-bold text-sm">Total</span>
          <span className="font-bold text-xl text-amber-700">₹{total.toFixed(2)}</span>
        </div>
        <button onClick={generate} disabled={busy} className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm active:scale-95 disabled:opacity-50">
          {busy ? "Generating PDF…" : "Generate & Send"}
        </button>
      </div>
    </SheetShell>
  );
}

// ============= MESSAGE RENDER HELPERS =============
export function LocationBubble({ loc }: { loc: LocationPayload }) {
  const [remaining, setRemaining] = useState<string>("");
  useEffect(() => {
    if (!loc.live || !loc.expiresAt) return;
    const tick = () => {
      const ms = (loc.expiresAt ?? 0) - Date.now();
      if (ms <= 0) { setRemaining("Expired"); return; }
      const m = Math.floor(ms / 60000);
      setRemaining(`${m}m left`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [loc.live, loc.expiresAt]);

  const mapImg = `https://staticmap.openstreetmap.de/staticmap.php?center=${loc.lat},${loc.lng}&zoom=15&size=280x140&markers=${loc.lat},${loc.lng},red-pushpin`;
  const openUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  return (
    <a href={openUrl} target="_blank" rel="noopener" className="block mb-1.5 -mx-1 rounded-xl overflow-hidden bg-white border border-black/10">
      <img src={mapImg} alt="map" className="w-full h-32 object-cover bg-gray-200"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      <div className="px-3 py-2 flex items-center gap-2">
        {loc.live ? <Navigation className="h-4 w-4 text-blue-500" /> : <MapPin className="h-4 w-4 text-emerald-500" />}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold truncate">{loc.label || "Location"}</p>
          <p className="text-[10px] text-gray-500">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)} {loc.live && remaining && `· ${remaining}`}</p>
        </div>
      </div>
    </a>
  );
}

export function QrPayBubble({ q }: { q: QrPayPayload }) {
  return (
    <div className="mb-1.5 -mx-1 rounded-xl overflow-hidden bg-white border border-amber-200">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-white uppercase tracking-wider">UPI Payment</span>
        <QrCode className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="p-3 flex flex-col items-center">
        <img src={q.qrDataUrl} alt="QR" className="h-40 w-40" />
        <p className="text-2xl font-bold mt-2 text-amber-700">₹{q.amount.toFixed(2)}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{q.upiId}</p>
        {q.note && <p className="text-[10px] text-gray-600 italic mt-0.5">"{q.note}"</p>}
        <a href={q.upiLink} className="mt-2 w-full py-2 rounded-full bg-amber-500 text-white text-xs font-bold text-center active:scale-95">
          Pay ₹{q.amount.toFixed(0)} in UPI App
        </a>
      </div>
    </div>
  );
}

export function ShopBubble({ s }: { s: ShopCardPayload }) {
  return (
    <a href={s.url} target="_blank" rel="noopener" className="block mb-1.5 -mx-1 rounded-xl overflow-hidden bg-white border border-orange-200">
      {s.logo ? (
        <img src={s.logo} alt={s.name} className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-orange-400 to-rose-500 grid place-items-center">
          <Store className="h-10 w-10 text-white" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-orange-600">Digital Shop</p>
        <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
        <p className="text-[10px] text-gray-500 truncate">{s.url}</p>
        <span className="mt-2 inline-block px-3 py-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold">Open Shop →</span>
      </div>
    </a>
  );
}

export function InvoiceBubble({ inv, vendorWhatsApp }: { inv: InvoicePayload; vendorWhatsApp?: string }) {
  const download = () => {
    const a = document.createElement("a");
    a.href = inv.pdfDataUrl; a.download = `${inv.number}.pdf`; a.click();
  };
  const shareWA = () => {
    const text = `Invoice ${inv.number}\nBill to: ${inv.customer}\nTotal: ₹${inv.total.toFixed(2)}\n\nItems:\n${inv.items.map(it => `• ${it.name} x${it.qty} = ₹${(it.qty * it.price).toFixed(0)}`).join("\n")}`;
    const phone = vendorWhatsApp?.replace(/\D/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };
  return (
    <div className="mb-1.5 -mx-1 rounded-xl overflow-hidden bg-white border border-amber-200">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Invoice / Quotation</span>
        <FileText className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="p-3">
        <p className="text-[10px] text-gray-500">{inv.number}</p>
        <p className="text-xs font-semibold text-gray-700">Bill to: {inv.customer}</p>
        <div className="my-2 space-y-1">
          {inv.items.slice(0, 3).map((it, i) => (
            <div key={i} className="flex justify-between text-[11px]">
              <span className="text-gray-700 truncate flex-1">{it.name} ×{it.qty}</span>
              <span className="font-semibold">₹{(it.qty * it.price).toFixed(0)}</span>
            </div>
          ))}
          {inv.items.length > 3 && <p className="text-[10px] text-gray-400">+{inv.items.length - 3} more</p>}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-[11px] font-bold">Total</span>
          <span className="text-base font-bold text-amber-700">₹{inv.total.toFixed(2)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={download} className="flex-1 py-2 rounded-full bg-gray-100 text-xs font-bold flex items-center justify-center gap-1">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          <button onClick={shareWA} className="flex-1 py-2 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1">
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
