import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ImageUpload({
  value,
  onChange,
  label = "Image",
  folder = "items",
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  folder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("catalog")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("catalog").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      alert("Upload failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-[#f5d97a]/80 font-bold mb-1.5 block">
        {label}
      </label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div
          className="relative rounded-xl overflow-hidden border border-[#d4af37]/30 bg-black/40 group"
          style={{ aspectRatio: "1 / 1", maxWidth: 140 }}
        >
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-red-300 hover:bg-red-500/30"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[#d4af37]/40 text-[#f5d97a] hover:bg-[#d4af37]/5 text-xs disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {busy ? "Uploading..." : "Upload image"}
        </button>
      )}
    </div>
  );
}

export function IconImage({
  url,
  icon,
  size = 40,
}: {
  url?: string | null;
  icon?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="rounded-lg object-cover border border-[#d4af37]/20 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  if (icon) {
    return (
      <div
        className="rounded-lg grid place-items-center text-lg shrink-0 border border-[#d4af37]/20 bg-black/30"
        style={{ width: size, height: size }}
      >
        {icon}
      </div>
    );
  }
  return (
    <div
      className="rounded-lg grid place-items-center shrink-0 border border-[#d4af37]/20 bg-black/30 text-[#d4af37]/40"
      style={{ width: size, height: size }}
    >
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}
