import { ActionPicker, type ActionOption } from "@/components/ActionPicker";
import { useActiveTypeId } from "@/hooks/use-active-type";
import goldOrders from "@/assets/gold-orders.png";
import goldRepair from "@/assets/gold-cat-repair.png";
import goldOther from "@/assets/gold-other.png";

/**
 * Catalog type picker (Product / Service / Other).
 * Uses ActionPicker so it looks IDENTICAL to the Reselling Program sheet:
 *  - Same gold icon tiles, same long-press to pin as default
 *  - Pinned type is remembered globally via useActiveTypeId()
 */
const TYPE_OPTIONS: ActionOption[] = [
  { value: "product", label: "Product", sub: "Browse products & shop categories", icon: goldOrders },
  { value: "service", label: "Service", sub: "Book trusted services nearby", icon: goldRepair, badge: "FAST" },
  { value: "other", label: "Other", sub: "Everything else · special needs", icon: goldOther },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mode is the catalog type code ('product' | 'service' | 'other'). */
  onCategoryPick: (mode: string, category: string) => void;
};

export function ProductServicePicker({ open, onClose, onCategoryPick }: Props) {
  const [activeTypeId, setActiveTypeId] = useActiveTypeId();

  const handleSelect = (value: string) => {
    const opt = TYPE_OPTIONS.find((o) => o.value === value);
    setActiveTypeId(value); // tap also activates the type
    onClose();
    setTimeout(() => onCategoryPick(value, opt?.label ?? value), 220);
  };

  return (
    <ActionPicker
      open={open}
      title="What you want?"
      subtitle="Choose a catalog to browse"
      options={TYPE_OPTIONS}
      onSelect={handleSelect}
      onClose={onClose}
      defaultValue={activeTypeId ?? undefined}
      onSetDefault={(value) => setActiveTypeId(value)}
    />
  );
}
