/**
 * Backward-compatible shims that delegate to the universal Smart Media picker.
 * - ImageUpload now supports upload, external URL, Lottie JSON, and emoji.
 * - IconImage auto-detects image / lottie / emoji.
 */
import { SmartMediaPicker } from "@/components/SmartMediaPicker";
import { SmartMedia } from "@/components/SmartMedia";

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
  return (
    <SmartMediaPicker
      value={value}
      onChange={onChange}
      label={label}
      folder={folder}
    />
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
  return <SmartMedia url={url} icon={icon} size={size} />;
}
