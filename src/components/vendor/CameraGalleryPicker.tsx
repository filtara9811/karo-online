import { useRef } from "react";
import { Camera, Image as ImageIcon, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  capture?: "user" | "environment";
  uploading?: boolean;
  onFiles: (files: File[]) => void | Promise<void>;
  onClose: () => void;
};

export function CameraGalleryPicker({
  open,
  title,
  description,
  accept = "image/*",
  multiple = false,
  capture = "environment",
  uploading = false,
  onFiles,
  onClose,
}: Props) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) void onFiles(files);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/55" onClick={() => !uploading && onClose()}>
      <div
        className="w-full rounded-t-3xl bg-white p-5 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-16px_45px_-22px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-200" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-neutral-950">{title}</h3>
            {description ? <p className="mt-0.5 text-xs font-medium text-neutral-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-700 disabled:opacity-50"
            aria-label="Close picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={uploading}
            className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 active:scale-[0.98] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-7 w-7" />}
            <span className="text-sm font-extrabold">Camera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-900 active:scale-[0.98] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-7 w-7" />}
            <span className="text-sm font-extrabold">Gallery</span>
            {multiple ? <span className="text-[10px] font-bold text-neutral-500">Multiple select</span> : null}
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept={accept}
          capture={capture}
          hidden
          onChange={(event) => {
            handleFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(event) => {
            handleFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}