import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TRADE_TREE, type TradeNode } from "@/lib/trade-tree";

const InputSchema = z.object({
  shop_type_hint: z.string().nullable().optional(),
  services: z.array(z.string()).nullable().optional(),
  products: z.array(z.string()).nullable().optional(),
  business_name: z.string().nullable().optional(),
});

export type CategorySuggestion = {
  path: string[]; // e.g. ["retailer", "apparel_r"]
  labels: string[]; // human labels for same path
  confidence: number; // 0..1
  reason?: string;
};

const OutputSchema = z.object({
  suggestions: z
    .array(
      z.object({
        path: z.array(z.string()).min(1).max(4),
        confidence: z.number().min(0).max(1),
        reason: z.string().nullable().optional(),
      }),
    )
    .max(5),
});

// Serialize the trade tree in a compact form the model can reason over.
function serializeTree(nodes: TradeNode[], depth = 0): string {
  return nodes
    .map((n) => {
      const indent = "  ".repeat(depth);
      const line = `${indent}- ${n.value}: ${n.label}${n.sub ? ` (${n.sub})` : ""}`;
      const kids = n.children?.length ? "\n" + serializeTree(n.children, depth + 1) : "";
      return line + kids;
    })
    .join("\n");
}

function resolvePath(path: string[]): { labels: string[]; valid: boolean } {
  const labels: string[] = [];
  let level: TradeNode[] | undefined = TRADE_TREE;
  for (const v of path) {
    const found = level?.find((n) => n.value === v);
    if (!found) return { labels, valid: false };
    labels.push(found.label);
    level = found.children;
  }
  return { labels, valid: true };
}

export const suggestCategoriesFromScan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ suggestions: CategorySuggestion[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const hasSignal =
      (data.shop_type_hint && data.shop_type_hint.trim().length > 0) ||
      (data.services && data.services.length > 0) ||
      (data.products && data.products.length > 0) ||
      (data.business_name && data.business_name.trim().length > 0);
    if (!hasSignal) return { suggestions: [] };

    const tree = serializeTree(TRADE_TREE);
    const prompt =
      `You classify an Indian small business into our internal Trade Line tree.\n\n` +
      `TREE (parent → children; value: label):\n${tree}\n\n` +
      `BUSINESS SIGNALS:\n` +
      `- name: ${data.business_name ?? "(unknown)"}\n` +
      `- shop_type_hint: ${data.shop_type_hint ?? "(unknown)"}\n` +
      `- services: ${(data.services ?? []).join(", ") || "(none)"}\n` +
      `- products: ${(data.products ?? []).join(", ") || "(none)"}\n\n` +
      `Return the TOP 3 most likely paths through the tree (root → leaf). ` +
      `Each path is an array of node "value" strings (NOT labels) from the tree above. ` +
      `Only use values that actually appear in the tree. Confidence 0..1.\n\n` +
      `Respond ONLY with JSON: {"suggestions":[{"path":["retailer","apparel_r"],"confidence":0.92,"reason":"short why"}, ...]}`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a strict classifier. Use only tree values that exist. Return valid JSON. No prose.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit — thodi der baad try karein");
      if (res.status === 402) throw new Error("AI credits khatam — workspace me add karein");
      throw new Error(`Category suggest failed [${res.status}]: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = {}; }
      }
    }
    const check = OutputSchema.safeParse(parsed);
    if (!check.success) return { suggestions: [] };

    const suggestions: CategorySuggestion[] = [];
    for (const s of check.data.suggestions) {
      const resolved = resolvePath(s.path);
      if (!resolved.valid) continue;
      suggestions.push({
        path: s.path,
        labels: resolved.labels,
        confidence: s.confidence,
        reason: s.reason ?? undefined,
      });
    }
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return { suggestions: suggestions.slice(0, 3) };
  });
