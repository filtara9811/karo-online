import { supabase } from "@/integrations/supabase/client";
import { getVisitorProfile, getVisitorToken } from "@/lib/landing-visitor";

/** One shopper ↔ merchant conversation on a shop landing page. */
export type ShopThread = {
  id: string;
  kind: "inquiry" | "order";
  status: string;
  quantity: number;
  product_name?: string | null;
  product_image?: string | null;
  product_price?: string | null;
  created_at: string;
  last_message_at: string;
  last_body?: string | null;
};

export type ShopMessage = {
  id: string;
  sender: "shopper" | "merchant";
  body: string;
  created_at: string;
};

export async function startShopThread(input: {
  code: string;
  kind: "inquiry" | "order";
  quantity?: number;
  message: string;
  product?: { id?: string; name?: string | null; image?: string | null; price?: string | null };
}): Promise<string | null> {
  const profile = getVisitorProfile();
  const { data, error } = await supabase.rpc("shop_thread_start" as never, {
    _code: input.code,
    _token: getVisitorToken(),
    _name: profile.name || null,
    _phone: profile.phone || null,
    _product: {
      id: input.product?.id ?? null,
      name: input.product?.name ?? null,
      image: input.product?.image ?? null,
      price: input.product?.price ?? null,
    },
    _kind: input.kind,
    _quantity: input.quantity ?? 1,
    _message: input.message,
  } as never);
  if (error) {
    console.error("[shop-chat] start", error);
    return null;
  }
  const res = data as unknown as { ok?: boolean; thread_id?: string };
  return res?.ok ? (res.thread_id ?? null) : null;
}

export async function listShopThreads(code: string): Promise<ShopThread[]> {
  const token = getVisitorToken();
  if (!token) return [];
  const { data, error } = await supabase.rpc("shop_thread_list" as never, { _code: code, _token: token } as never);
  if (error) {
    console.error("[shop-chat] list", error);
    return [];
  }
  return (data as unknown as ShopThread[]) ?? [];
}

export async function loadShopMessages(threadId: string): Promise<ShopMessage[]> {
  const { data, error } = await supabase.rpc("shop_thread_messages_for_visitor" as never, {
    _thread: threadId,
    _token: getVisitorToken(),
  } as never);
  if (error) {
    console.error("[shop-chat] messages", error);
    return [];
  }
  return (data as unknown as ShopMessage[]) ?? [];
}

export async function sendShopMessage(threadId: string, body: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("shop_thread_send" as never, {
    _thread: threadId,
    _token: getVisitorToken(),
    _body: body,
  } as never);
  if (error) {
    console.error("[shop-chat] send", error);
    return false;
  }
  return !!(data as unknown as { ok?: boolean })?.ok;
}

/** Push the shopper's edited name / phone onto their existing threads. */
export async function syncVisitorDetails(name: string, phone: string) {
  const token = getVisitorToken();
  if (!token) return;
  await supabase.rpc("shop_thread_update_visitor" as never, { _token: token, _name: name, _phone: phone } as never);
}
