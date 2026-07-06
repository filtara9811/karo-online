import { useEffect, useState } from "react";
import { Copy, Download, RefreshCw, CheckCircle2, Upload, Clock } from "lucide-react";
import { toast } from "sonner";

// UI-only QR payment sheet. Admin will wire live UPI/QR from admin panel later.
const DEFAULT_UPI = "karoonline@icici";
const DEFAULT_AMOUNT = 599;

function makeUpiUri(upi: string, amount: number, name = "Karo Online") {
  return `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(
    name,
  )}&am=${amount}&cu=INR&tn=Vendor%20Subscription`;
}
function qrImage(upi: string, amount: number) {
  const data = encodeURIComponent(makeUpiUri(upi, amount));
  return `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=8&data=${data}`;
}

export function QrPaymentSheet({
  upiId = DEFAULT_UPI,
  amount = DEFAULT_AMOUNT,
  onSubmitted,
}: {
  upiId?: string;
  amount?: number;
  onSubmitted?: (utr: string, screenshot: File | null) => void;
}) {
  const [nonce, setNonce] = useState(0);
  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(600); // 10 min

  useEffect(() => {
    setRemaining(600);
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [nonce]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const copy = async () => {
    await navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied");
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = qrImage(upiId, amount);
    a.download = "karo-online-payment-qr.png";
    a.target = "_blank";
    a.click();
  };
  const submit = async () => {
    if (utr.trim().length < 6) {
      toast.error("Valid UTR / transaction number daalein");
      return;
    }
    setBusy(true);
    try {
      onSubmitted?.(utr.trim(), file);
      toast.success("Payment submitted for verification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-5 pt-2 pb-8 max-w-md mx-auto">
      <div className="mx-auto w-10 h-1 rounded-full bg-neutral-200 mb-4" />
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900">Pay ₹{amount}</h2>
          <p className="text-xs text-neutral-500">Complete payment using any UPI app</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
          <Clock className="h-3.5 w-3.5" /> {mm}:{ss}
        </div>
      </div>

      {/* QR */}
      <div className="rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm">
        <div className="aspect-square rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-3 grid place-items-center">
          <img
            key={nonce}
            src={qrImage(upiId, amount)}
            alt="UPI QR"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 bg-neutral-50 rounded-xl px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold text-neutral-500 uppercase">UPI ID</div>
            <div className="text-sm font-bold text-neutral-900 truncate">{upiId}</div>
          </div>
          <button
            onClick={copy}
            className="h-9 px-3 rounded-lg bg-white border border-neutral-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={download}
            className="h-10 rounded-xl bg-white border border-neutral-200 text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Download QR
          </button>
          <button
            onClick={() => setNonce((n) => n + 1)}
            className="h-10 rounded-xl bg-white border border-neutral-200 text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* UTR */}
      <div className="mt-4 rounded-2xl bg-white border border-neutral-200 p-4 space-y-3">
        <div>
          <label className="text-[11px] font-bold text-neutral-700">UTR / Transaction Number</label>
          <input
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="Enter 12-digit UTR"
            className="mt-1 w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:border-amber-400 focus:bg-white"
          />
        </div>
        <label className="block">
          <span className="text-[11px] font-bold text-neutral-700">Payment Screenshot</span>
          <div className="mt-1 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 grid place-items-center">
              <Upload className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-800 truncate">
                {file ? file.name : "Tap to upload screenshot"}
              </div>
              <div className="text-[11px] text-neutral-500">PNG or JPG, up to 5 MB</div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </label>
        <button
          onClick={submit}
          disabled={busy}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> Submit for Verification
        </button>
        <p className="text-[11px] text-center text-neutral-500">
          Admin verify karega. Approval ke baad subscription active ho jayegi.
        </p>
      </div>
    </div>
  );
}
