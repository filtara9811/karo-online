import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  image_data_url: z.string().min(32),
  kind: z.enum(["visiting_card", "bill_book", "shop_board"]).default("visiting_card"),
});

const ExtractionSchema = z.object({
  business_name: z.string().nullable().optional(),
  owner_name: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  shop_type_hint: z.string().nullable().optional(),
  raw_text: z.string().nullable().optional(),
});

export type OcrExtraction = z.infer<typeof ExtractionSchema>;

const PROMPTS: Record<string, string> = {
  visiting_card:
    "This is a business visiting card photo. Extract the business/shop name, owner or contact person name, mobile number (10-digit Indian), WhatsApp (if separate), email, full address, city, pincode (6-digit), and a short shop type hint (e.g. 'electronics', 'grocery', 'clinic'). Also return the full raw text.",
  bill_book:
    "This is a photo of an Indian shop's bill/invoice or bill book cover. Extract the business name, owner name, mobile, WhatsApp, email, full address, city, pincode (6-digit), and shop type hint. Also return the full raw text.",
  shop_board:
    "This is a photo of a shop's signboard/hoarding. Extract the shop/business name, mobile if visible, city, pincode, address, and shop type hint (what the shop sells). Also return the full raw text.",
};

export const extractBusinessCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<OcrExtraction> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const prompt = PROMPTS[data.kind] ?? PROMPTS.visiting_card;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR + entity extractor for Indian small business documents. Return ONLY valid JSON matching the requested schema. Use null for any field you cannot confidently extract. Never invent values.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                prompt +
                "\n\nReturn a JSON object with exactly these keys (all optional, use null if unknown): business_name, owner_name, mobile, whatsapp, email, address, city, pincode, shop_type_hint, raw_text.",
            },
            { type: "image_url", image_url: { url: data.image_data_url } },
          ],
        },
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
      if (res.status === 402) throw new Error("AI credits khatam ho gaye — workspace me add karein");
      throw new Error(`OCR failed [${res.status}]: ${text.slice(0, 200)}`);
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
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = {};
        }
      }
    }

    const result = ExtractionSchema.safeParse(parsed);
    if (!result.success) return {};

    // Post-process: normalize mobile/pincode
    const normDigits = (v: string | null | undefined, len: number) => {
      if (!v) return null;
      const d = v.replace(/\D/g, "");
      if (d.length >= len) return d.slice(-len);
      return null;
    };
    const out: OcrExtraction = { ...result.data };
    out.mobile = normDigits(out.mobile, 10);
    out.whatsapp = normDigits(out.whatsapp, 10) ?? out.mobile;
    out.pincode = normDigits(out.pincode, 6);
    return out;
  });
