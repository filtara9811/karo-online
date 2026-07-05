import { useEffect, useState } from "react";
import { MapPin, Store, Building2, Phone, User, Package, Mic, Crosshair } from "lucide-react";
import { PhotoPicker } from "./PhotoPicker";

export type BusinessInfoDraft = {
  lat: number | null;
  lng: number | null;
  shop_name: string;
  shop_type: string;
  city: string;
  pincode: string;
  address: string;
  main_dealing: string;
  experience: string;
  business_nature: string;
  owner_name: string;
  whatsapp: string;
  front_image: string;
  inside_image: string;
  another_image: string;
  shop_video: string;
};

export const EMPTY_BUSINESS: BusinessInfoDraft = {
  lat: null,
  lng: null,
  shop_name: "",
  shop_type: "",
  city: "",
  pincode: "",
  address: "",
  main_dealing: "",
  experience: "",
  business_nature: "",
  owner_name: "",
  whatsapp: "",
  front_image: "",
  inside_image: "",
  another_image: "",
  shop_video: "",
};

const SHOP_TYPES = ["Shop", "Home Service", "Office", "Godown", "Online Only"];
const DEALING = ["Products", "Service", "Both"];
const EXPERIENCE = ["<1 yr", "1-3 yrs", "3-5 yrs", "5-10 yrs", "10+ yrs"];
const NATURE = ["Sole Proprietor", "Partnership", "Pvt Ltd", "LLP", "Freelancer"];

export function BusinessInfoSheet({
  draft,
  onChange,
  onSubmit,
}: {
  draft: BusinessInfoDraft;
  onChange: (d: BusinessInfoDraft) => void;
  onSubmit: () => void;
}) {
  const set = <K extends keyof BusinessInfoDraft>(k: K, v: BusinessInfoDraft[K]) =>
    onChange({ ...draft, [k]: v });

  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ ...draft, lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const [listening, setListening] = useState(false);
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.onresult = (e: any) =>
      set("address", (draft.address + " " + e.results[0][0].transcript).trim());
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const canSubmit =
    draft.shop_name.trim() &&
    draft.city.trim() &&
    draft.pincode.trim().length >= 4 &&
    draft.address.trim() &&
    draft.owner_name.trim() &&
    draft.whatsapp.trim().length >= 10;

  return (
    <div className="pb-32 px-4 pt-2 space-y-5 max-w-md mx-auto">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-neutral-900">Business Information</h2>
          <p className="text-sm text-neutral-500">Add your business basic details</p>
        </div>
        <span className="px-3 py-1 rounded-full border border-amber-400 text-amber-700 text-xs font-semibold">
          Step 1 of 3
        </span>
      </header>

      {/* Map card */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-200 h-40 bg-neutral-100">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("https://maps.googleapis.com/maps/api/staticmap?center=${
              draft.lat ?? 28.6139
            },${draft.lng ?? 77.209}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${
              draft.lat ?? 28.6139
            },${draft.lng ?? 77.209}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.9,
          }}
        />
        {!draft.lat && (
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-neutral-500">
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-xs">Location select karein</span>
          </div>
        )}
        <button
          type="button"
          onClick={locate}
          className="absolute top-2 right-2 z-20 h-9 w-9 rounded-full bg-white shadow grid place-items-center"
          aria-label="Current location"
        >
          <Crosshair className={`h-4 w-4 ${locating ? "animate-spin" : ""} text-neutral-700`} />
        </button>
      </div>

      {/* Shop name + type */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 flex items-center gap-3">
        <Store className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-2 divide-x divide-neutral-200">
          <div className="pr-2">
            <label className="block text-[11px] font-bold text-neutral-800">Enter Shop Name</label>
            <input
              value={draft.shop_name}
              onChange={(e) => set("shop_name", e.target.value)}
              placeholder="Enter shop or business name"
              className="w-full text-sm text-neutral-900 placeholder:text-neutral-400 bg-transparent outline-none"
            />
          </div>
          <div className="pl-2">
            <label className="block text-[11px] font-bold text-neutral-800">Shop Type</label>
            <select
              value={draft.shop_type}
              onChange={(e) => set("shop_type", e.target.value)}
              className="w-full text-sm text-neutral-900 bg-transparent outline-none"
            >
              <option value="">Select shop type</option>
              {SHOP_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* City / Pincode / Address */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 space-y-3">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 grid grid-cols-2 gap-2 divide-x divide-neutral-200">
            <div className="pr-2">
              <label className="block text-[11px] font-bold text-neutral-800">City</label>
              <input
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Select city"
                className="w-full text-sm bg-transparent outline-none"
              />
            </div>
            <div className="pl-2">
              <label className="block text-[11px] font-bold text-neutral-800">Pincode</label>
              <input
                value={draft.pincode}
                onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter pincode"
                inputMode="numeric"
                className="w-full text-sm bg-transparent outline-none"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-200 pt-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-neutral-800">Full Address</label>
              <textarea
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Type your complete business address"
                rows={2}
                className="w-full text-sm bg-transparent outline-none resize-none"
              />
            </div>
            <button
              type="button"
              onClick={startVoice}
              className={`p-2 rounded-full ${listening ? "bg-red-500 text-white" : "text-neutral-500"}`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dealing / Experience / Nature */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 flex items-center gap-2">
        <Package className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 grid grid-cols-3 gap-2 divide-x divide-neutral-200">
          <div className="pr-1">
            <label className="block text-[10px] font-bold text-neutral-800">Main Dealing In</label>
            <select
              value={draft.main_dealing}
              onChange={(e) => set("main_dealing", e.target.value)}
              className="w-full text-xs bg-transparent outline-none"
            >
              <option value="">Select</option>
              {DEALING.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="px-1">
            <label className="block text-[10px] font-bold text-neutral-800">Experience</label>
            <select
              value={draft.experience}
              onChange={(e) => set("experience", e.target.value)}
              className="w-full text-xs bg-transparent outline-none"
            >
              <option value="">Select</option>
              {EXPERIENCE.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="pl-1">
            <label className="block text-[10px] font-bold text-neutral-800">Nature</label>
            <select
              value={draft.business_nature}
              onChange={(e) => set("business_nature", e.target.value)}
              className="w-full text-xs bg-transparent outline-none"
            >
              <option value="">Select</option>
              {NATURE.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Name + WhatsApp */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 flex items-center gap-3">
        <User className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 grid grid-cols-2 gap-2 divide-x divide-neutral-200">
          <div className="pr-2">
            <label className="block text-[11px] font-bold text-neutral-800">Enter Name</label>
            <input
              value={draft.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
              placeholder="Owner name"
              className="w-full text-sm bg-transparent outline-none"
            />
          </div>
          <div className="pl-2">
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-amber-600" />
              <label className="text-[11px] font-bold text-neutral-800">WhatsApp</label>
            </div>
            <input
              value={draft.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="WhatsApp number"
              inputMode="tel"
              className="w-full text-sm bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Photos & Video */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 space-y-3">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">Photos & Video</h4>
          <p className="text-xs text-neutral-500">Add photos of your shop and a short video</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <PhotoPicker
            value={draft.front_image}
            onChange={(v) => set("front_image", v)}
            label="Front Image"
          />
          <PhotoPicker
            value={draft.inside_image}
            onChange={(v) => set("inside_image", v)}
            label="Inside Image"
          />
          <PhotoPicker
            value={draft.another_image}
            onChange={(v) => set("another_image", v)}
            label="Another Image"
          />
          <PhotoPicker
            value={draft.shop_video}
            onChange={(v) => set("shop_video", v)}
            label="Shop Video"
            accept="video/*"
            video
          />
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
        >
          Submit & Continue →
        </button>
      </div>
    </div>
  );
}
