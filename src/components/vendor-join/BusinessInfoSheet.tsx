import { useState } from "react";
import {
  X,
  Store,
  MapPin,
  Layers,
  Building2,
  Briefcase,
  User,
  Phone,
  Upload,
  Mic,
  Crosshair,
  Video,
  ChevronRight,
  FileText,
  Loader2,
  Image as ImageIcon,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { CameraGalleryPicker } from "@/components/vendor/CameraGalleryPicker";
import { SmartScannerSheet } from "@/components/vendor-join/SmartScannerSheet";
import type { OcrExtraction } from "@/lib/ocr.functions";
import { supabase } from "@/integrations/supabase/client";
import { uploadVendorMedia } from "@/lib/vendor-media";

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
  gallery_images: string[];
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
  gallery_images: [],
  shop_video: "",
};

const DEALING = ["Products", "Service", "Both"];
const PLACE_TYPES = ["Shop", "Home Service", "Office", "Godown", "Online Only"];
const BUSINESS_TYPES = ["Sole Proprietor", "Partnership", "Pvt Ltd", "LLP", "Freelancer"];

export function BusinessInfoSheet({
  draft,
  onChange,
  onSubmit,
  onClose,
}: {
  draft: BusinessInfoDraft;
  onChange: (d: BusinessInfoDraft) => void;
  onSubmit: () => void;
  onClose?: () => void;
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

  const [listening, setListening] = useState<"name" | "address" | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<"front_image" | "inside_image" | "another_image" | "gallery_images" | null>(null);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const applyOcr = (o: OcrExtraction) => {
    const next: BusinessInfoDraft = { ...draft };
    if (o.business_name) next.shop_name = o.business_name;
    if (o.owner_name) next.owner_name = o.owner_name;
    if (o.whatsapp) next.whatsapp = o.whatsapp.slice(-10);
    else if (o.mobile) next.whatsapp = o.mobile.slice(-10);
    if (o.address) next.address = o.address;
    if (o.city) next.city = o.city;
    if (o.pincode) next.pincode = o.pincode.slice(-6);
    if (o.shop_type_hint) {
      const hint = o.shop_type_hint.toLowerCase();
      const matched = PLACE_TYPES.find((t) => hint.includes(t.toLowerCase()) || t.toLowerCase().includes(hint));
      if (matched) next.shop_type = matched;
    }
    onChange(next);
  };
  const voice = (field: "shop_name" | "address") => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript as string;
      set(field, ((draft[field] as string) + " " + t).trim());
    };
    rec.onend = () => setListening(null);
    rec.start();
    setListening(field === "shop_name" ? "name" : "address");
  };

  const canSubmit =
    draft.shop_name.trim() &&
    draft.city.trim() &&
    draft.pincode.trim().length >= 4 &&
    draft.address.trim() &&
    draft.owner_name.trim() &&
    draft.whatsapp.trim().length >= 10;

  const uploadBusinessImages = async (
    field: "front_image" | "inside_image" | "another_image" | "gallery_images",
    files: File[],
  ) => {
    if (!files.length) return;
    setUploadingSlot(field);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Login required");
      const urls = await Promise.all(
        files.slice(0, field === "gallery_images" ? 10 : 1).map((file) =>
          uploadVendorMedia({ userId, file, kind: field === "gallery_images" ? "gallery" : "business", maxSide: 1600 }),
        ),
      );
      if (field === "gallery_images") {
        set("gallery_images", [...(draft.gallery_images ?? []), ...urls].slice(-30));
        setGalleryPickerOpen(false);
        toast.success(`${urls.length} gallery photo${urls.length > 1 ? "s" : ""} uploaded`);
      } else {
        set(field, urls[0] ?? "");
        toast.success("Image uploaded");
      }
    } catch (e: any) {
      toast.error(e?.message ? `Upload failed: ${e.message}` : "Upload failed");
    } finally {
      setUploadingSlot(null);
    }
  };

  return (
    <div className="px-5 pt-3 pb-28 max-w-md mx-auto">
      <div className="mx-auto w-10 h-1 rounded-full bg-neutral-300/70 mb-4" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900">Business Information</h2>
          <p className="text-sm text-neutral-500 mt-0.5">Add your business details</p>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full bg-neutral-100 grid place-items-center transition hover:bg-neutral-200"
        >
          <X className="h-4 w-4 text-neutral-700" />
        </button>
      </div>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-200 h-44 bg-neutral-100 mb-4">
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
          }}
        />
        {/* Pin */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-blue-400/25" />
            <div className="relative h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow" />
            <MapPin className="absolute -top-6 left-1/2 -translate-x-1/2 h-8 w-8 text-orange-500 fill-orange-500" />
          </div>
        </div>
        <button
          type="button"
          onClick={locate}
          className="absolute bottom-3 right-3 h-10 pl-3 pr-4 rounded-full bg-white shadow flex items-center gap-1.5 text-sm font-semibold text-neutral-800"
        >
          <Crosshair className={`h-4 w-4 ${locating ? "animate-spin" : ""}`} />
          Use my location
        </button>
      </div>

      {/* Shop Name */}
      <div className="rounded-2xl border border-neutral-200 bg-white px-4 h-14 flex items-center gap-3 mb-3">
        <Store className="h-5 w-5 text-neutral-500 shrink-0" />
        <input
          value={draft.shop_name}
          onChange={(e) => set("shop_name", e.target.value)}
          placeholder="Business / Shop Name"
          className="flex-1 text-[15px] bg-transparent outline-none placeholder:text-neutral-400"
        />
        <button
          type="button"
          onClick={() => voice("shop_name")}
          className={`h-8 w-8 rounded-full grid place-items-center ${
            listening === "name" ? "bg-red-500 text-white" : "text-neutral-400"
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      {/* City | Pincode */}
      <div className="rounded-2xl border border-neutral-200 bg-white h-14 flex items-center mb-3">
        <div className="flex-1 h-full flex items-center gap-3 px-4">
          <MapPin className="h-5 w-5 text-neutral-500" />
          <input
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="City"
            className="flex-1 text-[15px] bg-transparent outline-none placeholder:text-neutral-400"
          />
        </div>
        <div className="h-8 w-px bg-neutral-200" />
        <div className="flex-1 h-full flex items-center gap-3 px-4">
          <FileText className="h-5 w-5 text-neutral-500" />
          <input
            value={draft.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Pincode"
            inputMode="numeric"
            className="flex-1 text-[15px] bg-transparent outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Full address */}
      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-start gap-3 mb-3">
        <FileText className="h-5 w-5 text-neutral-500 mt-1 shrink-0" />
        <textarea
          value={draft.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Full Address (House No., Street, Area, Landmark)"
          rows={2}
          className="flex-1 text-[15px] bg-transparent outline-none placeholder:text-neutral-400 resize-none"
        />
        <button
          type="button"
          onClick={() => voice("address")}
          className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${
            listening === "address" ? "bg-red-500 text-white" : "text-neutral-400"
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      {/* 3 selects */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <SelectCard
          Icon={Layers}
          label="Service / Product"
          value={draft.main_dealing}
          onChange={(v) => set("main_dealing", v)}
          options={DEALING}
        />
        <SelectCard
          Icon={Building2}
          label="Place Type"
          value={draft.shop_type}
          onChange={(v) => set("shop_type", v)}
          options={PLACE_TYPES}
        />
        <SelectCard
          Icon={Briefcase}
          label="Business Type"
          value={draft.business_nature}
          onChange={(v) => set("business_nature", v)}
          options={BUSINESS_TYPES}
        />
      </div>

      {/* Owner + WhatsApp */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 flex items-center gap-2">
          <User className="h-5 w-5 text-neutral-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-neutral-800">Owner / Operator Name</div>
            <input
              value={draft.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
              placeholder="Enter full name"
              className="w-full text-[13px] bg-transparent outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 flex items-center gap-2">
          <Phone className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-neutral-800">WhatsApp Number</div>
            <input
              value={draft.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="+91 98765 43210"
              inputMode="tel"
              className="w-full text-[13px] bg-transparent outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      {/* Shop Images */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-base font-extrabold text-neutral-900">Shop Images</h4>
        <span className="text-xs font-semibold text-orange-500">Tap on image to preview</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <ImageSlot
          value={draft.front_image}
          onChange={(v) => set("front_image", v)}
          label="Shop Front Image"
          uploading={uploadingSlot === "front_image"}
          onPick={(files) => uploadBusinessImages("front_image", files)}
        />
        <ImageSlot
          value={draft.inside_image}
          onChange={(v) => set("inside_image", v)}
          label="Shop Interior Image"
          uploading={uploadingSlot === "inside_image"}
          onPick={(files) => uploadBusinessImages("inside_image", files)}
        />
        <ImageSlot
          value={draft.another_image}
          onChange={(v) => set("another_image", v)}
          label="Owner Image"
          uploading={uploadingSlot === "another_image"}
          onPick={(files) => uploadBusinessImages("another_image", files)}
        />
      </div>

      <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-neutral-900">Gallery / KYC Photos</div>
            <div className="text-[11px] text-neutral-500">Camera ya gallery se multiple photos upload karein</div>
          </div>
          <button
            type="button"
            onClick={() => setGalleryPickerOpen(true)}
            disabled={uploadingSlot === "gallery_images"}
            className="h-10 px-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {uploadingSlot === "gallery_images" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Add
          </button>
        </div>
        {draft.gallery_images?.length ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {draft.gallery_images.map((url) => (
              <div key={url} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                <img src={url} alt="Gallery" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set("gallery_images", draft.gallery_images.filter((item) => item !== url))}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 shadow"
                  aria-label="Remove gallery photo"
                >
                  <X className="h-3 w-3 text-neutral-700" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <CameraGalleryPicker
        open={galleryPickerOpen}
        title="Upload Gallery Photos"
        description="Multiple photos select kar sakte hain."
        multiple
        uploading={uploadingSlot === "gallery_images"}
        onClose={() => setGalleryPickerOpen(false)}
        onFiles={(files) => uploadBusinessImages("gallery_images", files)}
      />

      {/* 360 video row */}
      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-neutral-100 grid place-items-center">
          <Video className="h-5 w-5 text-neutral-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-neutral-900">Upload 360° Video (Optional)</div>
          <div className="text-[11px] text-neutral-500">Show your business in detail</div>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) set("shop_video", URL.createObjectURL(f));
            }}
          />
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        </label>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[.99] disabled:opacity-40 text-white font-bold text-[15px] shadow-md transition-all duration-200"
        >
          Submit & Continue
        </button>
      </div>

      {/* Floating Smart Scanner FAB */}
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        aria-label="Smart Scanner — auto-fill from photo"
        className="fixed z-40 bottom-24 right-5 h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white grid place-items-center shadow-lg shadow-amber-500/40 active:scale-95 transition"
      >
        <ScanLine className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-neutral-900 text-[9px] font-extrabold text-amber-300 grid place-items-center">AI</span>
      </button>

      <SmartScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onApply={applyOcr}
      />
    </div>
  );
}

function SelectCard({
  Icon,
  label,
  value,
  onChange,
  options,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-2.5 py-2 flex items-center gap-1.5 min-w-0">
      <Icon className="h-4 w-4 text-neutral-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-neutral-800 leading-tight truncate">
          {label}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[11px] text-neutral-600 bg-transparent outline-none appearance-none pr-1 truncate"
        >
          <option value="">Select option</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ImageSlot({
  value,
  onChange,
  label,
  uploading,
  onPick,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  uploading?: boolean;
  onPick: (files: File[]) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        onClick={() => !uploading && setOpen(true)}
        onKeyDown={(event) => {
          if (!uploading && (event.key === "Enter" || event.key === " ")) setOpen(true);
        }}
        className="relative block aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-white text-left"
        aria-disabled={uploading}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-white/90 grid place-items-center shadow"
            >
              <X className="h-3.5 w-3.5 text-neutral-700" />
            </button>
          </>
        ) : uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-orange-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[11px] font-semibold">Uploading</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-500">
            <Upload className="h-6 w-6" />
            <span className="text-[11px] font-semibold">Upload Image</span>
          </div>
        )}
      </div>
      <div className="text-[11px] text-neutral-600 text-center mt-1.5">{label}</div>
      <CameraGalleryPicker
        open={open}
        title={label}
        description="Camera ya gallery se image select karein."
        uploading={uploading}
        onClose={() => setOpen(false)}
        onFiles={async (files) => {
          await onPick(files);
          setOpen(false);
        }}
      />
    </div>
  );
}
