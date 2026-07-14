import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const KindEnum = z.enum(["visiting_card", "bill_book", "shop_board"]);
export type ScanKind = z.infer<typeof KindEnum>;

const ImageInput = z.object({
  image_data_url: z.string().min(32),
  kind: KindEnum.default("visiting_card"),
});

// Backward-compatible input: accepts either single {image_data_url,kind}
// OR new {images: [...]} shape (up to 5).
const InputSchema = z.union([
  ImageInput,
  z.object({ images: z.array(ImageInput).min(1).max(5) }),
]);

const ExtractionSchema = z.object({
  business_name: z.string().nullable().optional(),
  owner_name: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  alt_phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  landmark: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  established_year: z.string().nullable().optional(),
  business_hours: z.string().nullable().optional(),
  shop_type_hint: z.string().nullable().optional(),
  services: z.array(z.string()).nullable().optional(),
  products: z.array(z.string()).nullable().optional(),
  raw_text: z.string().nullable().optional(),
  // Per-field confidence 0..1 — model self-reports how sure it is per key.
  _confidence: z.record(z.string(), z.number().min(0).max(1)).nullable().optional(),
});

export type OcrExtraction = z.infer<typeof ExtractionSchema>;

const KIND_DESC: Record<ScanKind, string> = {
  visiting_card: "a business visiting card",
  bill_book: "an Indian shop's bill/invoice/bill book",
  shop_board: "a shop signboard/hoarding/banner",
};

const GSTIN_STATE: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "36": "Telangana",
  "37": "Andhra Pradesh",
};

export const extractBusinessCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<OcrExtraction> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");

    const images = "images" in data ? data.images : [data];

    const kindsText = images
      .map((im, i) => `Image ${i + 1}: ${KIND_DESC[im.kind]}`)
      .join("\n");

    const prompt =
      `You are given ${images.length} photo${images.length > 1 ? "s" : ""} of an Indian small business.\n` +
      `${kindsText}\n\n` +
      `Read EVERY image carefully (OCR + visual context). Merge information across images — ` +
      `if the visiting card gives the phone and the shop board gives the category, combine both. ` +
      `For each field, use the most confident/complete value across images.\n\n` +
      `Return ONE JSON object with these keys (all optional, use null / [] if unknown):\n` +
      `business_name, owner_name, mobile (10-digit Indian), whatsapp, alt_phone, email, ` +
      `address (full), landmark, city, state, pincode (6-digit), gstin (15-char), ` +
      `website (URL or social handle), established_year, business_hours (e.g. "10AM-9PM"), ` +
      `shop_type_hint (short category like "electronics", "menswear", "grocery", "clinic"), ` +
      `services (array of services offered, max 6), products (array of products sold, max 8), ` +
      `raw_text (concatenated OCR text), ` +
      `_confidence (object with SAME keys as above whose values are your self-rated confidence 0.0-1.0 for each extracted field; omit keys you did not extract).\n\n` +
      `For shop boards/banners with only a name and phone visible, still extract those confidently.`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR + entity extractor for Indian small business documents. Return ONLY valid JSON. Use null / empty array for unknowns. Never invent values.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...images.map((im) => ({
              type: "image_url" as const,
              image_url: { url: im.image_data_url },
            })),
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

    // Post-process: normalize digits, validate GSTIN, auto-fill state from GSTIN prefix
    const normDigits = (v: string | null | undefined, len: number) => {
      if (!v) return null;
      const d = v.replace(/\D/g, "");
      if (d.length >= len) return d.slice(-len);
      return null;
    };
    const out: OcrExtraction = { ...result.data };
    out.mobile = normDigits(out.mobile, 10);
    out.whatsapp = normDigits(out.whatsapp, 10) ?? out.mobile;
    out.alt_phone = normDigits(out.alt_phone, 10);
    out.pincode = normDigits(out.pincode, 6);

    // GSTIN validation (15 chars: 2 digit state + 10 PAN + 3 tail)
    if (out.gstin) {
      const g = out.gstin.replace(/\s/g, "").toUpperCase();
      if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(g)) {
        out.gstin = g;
        if (!out.state) {
          const st = GSTIN_STATE[g.slice(0, 2)];
          if (st) out.state = st;
        }
      } else {
        out.gstin = null;
      }
    }

    return out;
  });
