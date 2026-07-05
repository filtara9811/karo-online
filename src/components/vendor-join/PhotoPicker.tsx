import { useRef, useState } from "react";
import { Camera, ImageIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Source = "camera" | "gallery";

export function PhotoPicker({
  value,
  onChange,
  label,
  bucket = "vendor-photos",
  accept = "image/*",
  video = false,
  icon,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  bucket?: string;
  accept?: string;
  video?: boolean;
  icon?: React.ReactNode;
}) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showChoice, setShowChoice] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (video ? "mp4" : "jpg");
      const key = `${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage.from(bucket).upload(key, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
      onChange(pub.publicUrl);
      toast.success(`${label} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      setShowChoice(false);
    }
  };

  const pick = (src: Source) => {
    const ref = src === "camera" ? cameraRef : galleryRef;
    ref.current?.click();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (value ? onChange("") : setShowChoice(true))}
        className="relative w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-50/60 flex flex-col items-center justify-center gap-2 p-2 overflow-hidden hover:border-amber-500 transition-colors"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        ) : value ? (
          <>
            {video ? (
              <video src={value} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <span className="relative z-10 self-end p-1 rounded-full bg-black/60 text-white">
              <X className="h-3 w-3" />
            </span>
          </>
        ) : (
          <>
            <div className="text-amber-600 text-2xl">{icon ?? <ImageIcon className="h-6 w-6" />}</div>
            <div className="text-[11px] font-semibold text-neutral-800 leading-tight text-center">
              {label}
            </div>
            <div className="text-[10px] text-amber-600">Upload</div>
          </>
        )}
      </button>

      {showChoice && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-end"
          onClick={() => setShowChoice(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-1 bg-neutral-300 rounded-full" />
            <h3 className="text-base font-bold text-neutral-900">
              {video ? "Video" : "Photo"} kaise add karein?
            </h3>
            <button
              onClick={() => pick("camera")}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-neutral-900"
            >
              <Camera className="h-5 w-5 text-amber-600" />
              <div className="text-left">
                <div className="font-semibold">Camera</div>
                <div className="text-xs text-neutral-600">Live {video ? "record" : "photo"} lein</div>
              </div>
            </button>
            <button
              onClick={() => pick("gallery")}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
            >
              <ImageIcon className="h-5 w-5 text-neutral-700" />
              <div className="text-left">
                <div className="font-semibold">Gallery</div>
                <div className="text-xs text-neutral-600">Phone se select karein</div>
              </div>
            </button>
            <button
              onClick={() => setShowChoice(false)}
              className="w-full p-3 rounded-xl text-neutral-600 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        capture={video ? "user" : "environment"}
        hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </>
  );
}
