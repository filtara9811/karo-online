import { createContext, useContext, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  variation?: string;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  flying: boolean;
  triggerFly: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [flying, setFlying] = useState(false);

  const add: Ctx["add"] = (item) => {
    setItems((prev) => {
      const key = item.id + (item.variation ?? "");
      const existing = prev.find((p) => p.id + (p.variation ?? "") === key);
      if (existing) {
        return prev.map((p) => (p === existing ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((prev) => (qty <= 0 ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? { ...p, qty } : p))));
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  const triggerFly = () => {
    setFlying(true);
    setTimeout(() => setFlying(false), 900);
  };

  return (
    <CartCtx.Provider value={{ items, add, remove, setQty, clear, count, subtotal, flying, triggerFly }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) {
    return {
      items: [] as CartItem[],
      add: () => {},
      remove: () => {},
      setQty: () => {},
      clear: () => {},
      count: 0,
      subtotal: 0,
      flying: false,
      triggerFly: () => {},
    };
  }
  return ctx;
}
