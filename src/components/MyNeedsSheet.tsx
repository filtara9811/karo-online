import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X, Send, Plus, Minus, Mic, MicOff, Volume2, Trash2, Pencil, ImageIcon, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/use-voice-input";

type DBCategory = { id: string; type_id: string | null; parent_id: string | null; name: string; slug: string; icon: string | null; image_url: string | null; sort_order: number };
type DBItem = { id: string; category_id: string; name: string; slug: string };

type NeedRow = {
  id: string;
  user_id: string;
  type_id: string | null;
  root_category_id: string | null;
  sub_category_id: string | null;
  item_id: string | null;
  title: string;
  notes: string;
  quantity: number;
  images: string[];
  status: string;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  typeId?: string | null;
  rootCategories: DBCategory[];
  subCategoriesByRoot: Record<string, DBCategory[]>;
  itemsBySub: Record<string, DBItem[]>;
  defaultRootId?: string | null;
  defaultSubId?: string | null;
};

const MAX_CARDS = 3;
const MAX_IMAGES = 4;

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "hi-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export function MyNeedsSheet({
  open,
  onClose,
  typeId,
  rootCategories,
  subCategoriesByRoot,
  itemsBySub,
  defaultRootId,
  defaultSubId,
}: Props) {
  const [view, setView] = useState<"list" | "form">("list");
  const [needs, setNeeds] = useState<NeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // form state
  const [rootId, setRootId] = useState<string | null>(defaultRootId ?? null);
  const [subId, setSubId] = useState<string | null>(defaultSubId ?? null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceInput((t) => setNotes((p) => (p ? p + " " : "") + t));

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const loadNeeds = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNeeds([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_needs" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setNeeds(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setView("list");
      setEditId(null);
      loadNeeds();
    }
  }, [open]);

  const subList = useMemo(
    () => (rootId ? subCategoriesByRoot[rootId] ?? [] : []),
    [rootId, subCategoriesByRoot],
  );
  const itemList = useMemo(
    () => (subId ? itemsBySub[subId] ?? [] : []),
    [subId, itemsBySub],
  );

  const resetForm = () => {
    setEditId(null);
    setRootId(defaultRootId ?? null);
    setSubId(defaultSubId ?? null);
    setItemId(null);
    setTitle("");
    setNotes("");
    setQty(1);
    setImages([]);
  };

  const startAdd = () => {
    if (needs.length >= MAX_CARDS) {
      toast.error(`Maximum ${MAX_CARDS} needs allowed. Delete one first.`);
      return;
    }
    resetForm();
    setView("form");
  };

  const startEdit = (n: NeedRow) => {
    setEditId(n.id);
    setRootId(n.root_category_id);
    setSubId(n.sub_category_id);
    setItemId(n.item_id);
    setTitle(n.title);
    setNotes(n.notes);
    setQty(n.quantity);
    setImages(n.images || []);
    setView("form");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    const remaining = MAX_IMAGES - images.length;
    const list = Array.from(files).slice(0, remaining);
    for (const f of list) {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `user-needs/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("catalog").upload(path, f, { upsert: false });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data } = supabase.storage.from("catalog").getPublicUrl(path);
      setImages((p) => [...p, data.publicUrl].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (idx: number) => setImages((p) => p.filter((_, i) => i !== idx));

  const deleteNeed = async (id: string) => {
    const { error } = await supabase.from("user_needs" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Need removed");
    setNeeds((p) => p.filter((n) => n.id !== id));
  };

  const submit = async () => {
    if (!subId) return toast.error("Please pick a category");
    if (!title.trim() && !notes.trim()) return toast.error("Please add a title or notes");
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return toast.error("Please sign in first");
    }
    const payload = {
      user_id: user.id,
      type_id: typeId ?? null,
      root_category_id: rootId,
      sub_category_id: subId,
      item_id: itemId,
      title: title.trim() || (subList.find((s) => s.id === subId)?.name ?? "Need"),
      notes: notes.trim(),
      quantity: qty,
      images,
      status: "active",
    };
    let error: any;
    if (editId) {
      ({ error } = await supabase.from("user_needs" as any).update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("user_needs" as any).insert(payload));
    }
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Need updated" : "Need submitted — vendors will respond soon");
    resetForm();
    setView("list");
    loadNeeds();
  };

  if (!open) return null;

  const subName = (id: string | null) => {
    if (!id) return "";
    for (const arr of Object.values(subCategoriesByRoot)) {
      const f = arr.find((s) => s.id === id);
      if (f) return f.name;
    }
    return "";
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[88dvh] flex flex-col bg-gradient-to-b from-white via-[#fffdf5] to-[#fdf8e8] border-t-2 border-[color:oklch(0.78_0.14_82/0.6)] rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(212,175,55,0.4)] pb-[env(safe-area-inset-bottom)]"
        style={{ animation: "sheet-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-80" />
        </div>

        <div className="px-5 pt-2 pb-3 flex items-center gap-3 border-b border-[color:oklch(0.78_0.14_82/0.25)] flex-shrink-0">
          <span className="h-11 w-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#ff6b6b] to-[#c92a2a] shadow-[0_4px_14px_-4px_rgba(201,42,42,0.5)]">
            <Send className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-gold-gradient font-bold leading-tight">
              {view === "form" ? (editId ? "Edit your need" : "Apni need likhiye") : "My Needs"}
            </h3>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:oklch(0.55_0.10_82)] mt-0.5">
              {view === "list"
                ? `${needs.length}/${MAX_CARDS} cards · vendors will see these`
                : subName(subId) || "Pick category"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-[color:oklch(0.42_0.10_82)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {view === "list" && (
            <>
              {loading && <div className="text-center text-sm text-muted-foreground py-6">Loading…</div>}
              {!loading && needs.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.4)] rounded-2xl">
                  <p className="text-sm font-display text-[color:oklch(0.30_0.05_85)]">No needs added yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Tap "Add new need" below.</p>
                </div>
              )}
              {needs.map((n) => (
                <div key={n.id} className="rounded-2xl bg-white border-2 border-[color:oklch(0.78_0.14_82/0.35)] p-3 shadow-sm">
                  <div className="flex gap-3">
                    {n.images?.[0] ? (
                      <img src={n.images[0]} alt="" className="h-16 w-16 rounded-xl object-cover border border-[color:oklch(0.78_0.14_82/0.4)]" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#fff8dc] to-[#fdf3c8] grid place-items-center border border-[color:oklch(0.78_0.14_82/0.4)]">
                        <ImageIcon className="h-6 w-6 text-[color:oklch(0.55_0.10_82)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display font-bold text-sm text-[color:oklch(0.25_0.05_85)] truncate">{n.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex-shrink-0">Qty {n.quantity}</span>
                      </div>
                      <p className="text-[11px] text-[color:oklch(0.45_0.08_85)] mt-0.5">{subName(n.sub_category_id) || "Category"}</p>
                      {n.notes && <p className="text-xs text-[color:oklch(0.35_0.05_85)] mt-1 line-clamp-2">{n.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[color:oklch(0.78_0.14_82/0.2)]">
                    <button
                      onClick={() => startEdit(n)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#fff8dc] text-[color:oklch(0.35_0.10_82)] text-xs font-semibold active:scale-95"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    {n.notes && (
                      <button
                        onClick={() => speak(n.notes)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[color:oklch(0.78_0.14_82/0.4)] text-xs font-semibold active:scale-95"
                        aria-label="Read aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNeed(n.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold active:scale-95"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {needs.length < MAX_CARDS && (
                <button
                  onClick={startAdd}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] text-[color:oklch(0.35_0.10_82)] font-display font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add new need
                </button>
              )}
            </>
          )}

          {view === "form" && (
            <>
              {/* Root category chips */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">Category</label>
                <div className="flex gap-2 mt-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
                  {rootCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setRootId(c.id); setSubId(null); setItemId(null); }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                        rootId === c.id
                          ? "bg-gradient-to-br from-[#d97706] to-[#c2410c] text-white border-[#c2410c]"
                          : "bg-white text-[color:oklch(0.35_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                      }`}
                    >
                      {c.icon && /\p{Emoji}/u.test(c.icon) ? <span className="mr-1">{c.icon}</span> : null}
                      {c.name.replace(/ Services?$/i, "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub category chips */}
              {subList.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">Sub-category</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {subList.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSubId(s.id); setItemId(null); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                          subId === s.id
                            ? "bg-[color:oklch(0.78_0.14_82)] text-white border-[color:oklch(0.78_0.14_82)]"
                            : "bg-white text-[color:oklch(0.35_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Child / item (optional) */}
              {itemList.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">Type (optional)</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {itemList.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => setItemId(itemId === it.id ? null : it.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                          itemId === it.id
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-[color:oklch(0.35_0.05_85)] border-[color:oklch(0.78_0.14_82/0.4)]"
                        }`}
                      >
                        {it.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Split AC 1.5 ton service"
                  className="mt-1.5 w-full rounded-xl border-2 border-[color:oklch(0.78_0.14_82/0.4)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:oklch(0.78_0.14_82)]"
                />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between rounded-xl border-2 border-[color:oklch(0.78_0.14_82/0.4)] bg-white px-3 py-2">
                <span className="text-xs font-semibold text-[color:oklch(0.35_0.05_85)]">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-full bg-[#fff8dc] border border-[color:oklch(0.78_0.14_82/0.5)] grid place-items-center active:scale-90"
                    aria-label="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-display font-bold text-lg w-7 text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(999, q + 1))}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-[#d97706] to-[#c2410c] text-white grid place-items-center active:scale-90"
                    aria-label="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Notes with voice */}
              <div className="relative">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='e.g. "Bathroom tap leak, urgent. Same-day visit."'
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border-2 border-[color:oklch(0.78_0.14_82/0.4)] bg-white px-3 py-2.5 pr-20 text-sm outline-none focus:border-[color:oklch(0.78_0.14_82)] resize-none"
                />
                <div className="absolute right-2 bottom-2 flex gap-1.5">
                  {voice.supported && (
                    <button
                      onClick={voice.toggle}
                      className={`h-8 w-8 grid place-items-center rounded-full border active:scale-90 ${
                        voice.listening
                          ? "bg-red-500 border-red-600 text-white animate-pulse"
                          : "bg-white border-[color:oklch(0.78_0.14_82/0.5)] text-[color:oklch(0.42_0.10_82)]"
                      }`}
                      aria-label={voice.listening ? "Stop voice" : "Voice input"}
                    >
                      {voice.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {notes && (
                    <button
                      onClick={() => speak(notes)}
                      className="h-8 w-8 grid place-items-center rounded-full bg-white border border-[color:oklch(0.78_0.14_82/0.5)] active:scale-90"
                      aria-label="Speak"
                    >
                      <Volume2 className="h-3.5 w-3.5 text-[color:oklch(0.42_0.10_82)]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[color:oklch(0.45_0.08_85)]">Photos ({images.length}/{MAX_IMAGES})</label>
                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  {images.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-[color:oklch(0.78_0.14_82/0.5)] shadow-sm">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 grid place-items-center"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="h-16 w-16 rounded-xl border-2 border-dashed border-[color:oklch(0.78_0.14_82/0.6)] grid place-items-center bg-gradient-to-br from-[#fff8dc] to-[#f5e9b8] text-[color:oklch(0.42_0.10_82)] active:scale-95"
                    >
                      <Camera className="h-6 w-6" />
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {view === "form" && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-[color:oklch(0.78_0.14_82/0.25)] bg-white/80 backdrop-blur flex gap-2">
            <button
              onClick={() => { resetForm(); setView("list"); }}
              className="px-4 py-3 rounded-xl bg-white border border-[color:oklch(0.78_0.14_82/0.5)] font-display text-sm font-bold text-[color:oklch(0.35_0.10_82)] active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={sending || !subId}
              className="flex-1 relative overflow-hidden rounded-xl py-3 bg-gold-bar text-[color:oklch(0.13_0.06_18)] font-display font-bold text-sm shadow-gold-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "Saving…" : editId ? "Update need" : "Submit to vendors"}
            </button>
          </div>
        )}
        {view === "list" && needs.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-[color:oklch(0.78_0.14_82/0.25)] flex items-center justify-between text-[10px] text-[color:oklch(0.55_0.10_82)]">
            <span>Vendors in your area will respond shortly.</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
