import { forwardRef } from "react";
import type { CartLine } from "@/components/POSInvoiceSheet";
import type { Customer } from "@/components/CustomerPickerSheet";

type Props = {
  invoice: string;
  trackingId: string;
  date: string;
  shopName: string;
  shopTagline?: string;
  customer: Customer | null;
  cart: CartLine[];
  subtotal: number;
  discountAmt: number;
  discountLabel?: string;
  taxAmt: number;
  taxLabel?: string;
  deliveryFee: number;
  couponCode?: string;
  total: number;
  payMode: string;
};

/**
 * Off-screen rendered invoice — captured by html2canvas and shared on WhatsApp.
 * Designed to look like a luxury thermal/A6 receipt with the brand gold palette.
 */
export const InvoiceImage = forwardRef<HTMLDivElement, Props>(function InvoiceImage(
  {
    invoice,
    trackingId,
    date,
    shopName,
    shopTagline,
    customer,
    cart,
    subtotal,
    discountAmt,
    discountLabel,
    taxAmt,
    taxLabel,
    deliveryFee,
    couponCode,
    total,
    payMode,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        width: 480,
        padding: "28px 28px 32px",
        background:
          "linear-gradient(180deg, #ffffff 0%, #fffdf5 30%, #fbf3d9 100%)",
        color: "#1a1208",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        boxSizing: "border-box",
        border: "2px solid #d4af37",
        borderRadius: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background:
              "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37, #8b6508)",
            display: "grid",
            placeItems: "center",
            color: "#1a1208",
            fontWeight: 800,
            fontSize: 22,
            border: "3px solid #fff",
            boxShadow: "0 4px 12px rgba(212,175,55,0.45)",
          }}
        >
          {shopName.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#8b6508",
              fontWeight: 700,
            }}
          >
            ✦ Tax Invoice ✦
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              background: "linear-gradient(90deg, #8b6508, #d4af37, #8b6508)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1,
            }}
          >
            {shopName}
          </div>
          {shopTagline && (
            <div style={{ fontSize: 10, color: "#8b6508" }}>{shopTagline}</div>
          )}
        </div>
      </div>

      {/* Invoice + tracking */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderRadius: 10,
          fontSize: 11,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#8b6508", fontWeight: 700 }}>INVOICE</div>
          <div style={{ fontWeight: 800, fontSize: 12 }}>{invoice}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#8b6508", fontWeight: 700 }}>TRACKING</div>
          <div style={{ fontWeight: 800, fontSize: 12 }}>{trackingId}</div>
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "#8b6508", fontWeight: 700 }}>DATE</div>
          <div style={{ fontWeight: 800, fontSize: 11 }}>{date}</div>
        </div>
      </div>

      {/* Customer */}
      {customer && (
        <div
          style={{
            marginBottom: 14,
            padding: 10,
            background: "#ffffff",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 9, color: "#8b6508", fontWeight: 700, marginBottom: 2 }}>
            BILL TO
          </div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{customer.name}</div>
          <div style={{ fontSize: 11, color: "#5a4520" }}>
            {customer.phone}
            {customer.gst ? ` · GST ${customer.gst}` : ""}
          </div>
          {customer.address && (
            <div style={{ fontSize: 11, color: "#5a4520" }}>{customer.address}</div>
          )}
        </div>
      )}

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "linear-gradient(180deg, #fff8dc, #f5d97a)" }}>
            <th style={th}>Item</th>
            <th style={{ ...th, textAlign: "center", width: 40 }}>Qty</th>
            <th style={{ ...th, textAlign: "right", width: 70 }}>Price</th>
            <th style={{ ...th, textAlign: "right", width: 80 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((l) => {
            const price = l.priceOverride ?? l.product.price;
            return (
              <tr key={l.product.id} style={{ borderBottom: "1px dashed rgba(212,175,55,0.4)" }}>
                <td style={{ ...td, display: "flex", alignItems: "center", gap: 8 }}>
                  {l.product.image && (
                    <img
                      src={l.product.image}
                      alt=""
                      crossOrigin="anonymous"
                      style={{
                        width: 36,
                        height: 36,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid rgba(212,175,55,0.5)",
                      }}
                    />
                  )}
                  <span style={{ fontWeight: 700 }}>{l.product.name}</span>
                </td>
                <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{l.qty}</td>
                <td style={{ ...td, textAlign: "right" }}>₹{price.toLocaleString()}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>
                  ₹{(price * l.qty).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "2px solid rgba(212,175,55,0.5)" }}>
        <Row label="Subtotal" value={`₹${subtotal.toLocaleString()}`} />
        {discountAmt > 0 && (
          <Row
            label={`Discount${discountLabel ? ` (${discountLabel})` : ""}${
              couponCode ? ` · ${couponCode}` : ""
            }`}
            value={`-₹${discountAmt.toFixed(0)}`}
          />
        )}
        {taxAmt !== 0 && (
          <Row
            label={`GST${taxLabel ? ` (${taxLabel})` : ""}`}
            value={`${taxAmt > 0 ? "+" : ""}₹${taxAmt.toFixed(0)}`}
          />
        )}
        {deliveryFee > 0 && <Row label="Delivery" value={`+₹${deliveryFee}`} />}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: "linear-gradient(180deg, #fff8dc, #f5d97a, #d4af37)",
            color: "#1a1208",
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          <span>TOTAL</span>
          <span>₹{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#5a4520",
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          Payment Mode · {payMode}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 10,
          borderTop: "1px dashed rgba(212,175,55,0.5)",
          textAlign: "center",
          fontSize: 10,
          color: "#8b6508",
          fontWeight: 600,
        }}
      >
        Thank you for shopping with us · This is a computer-generated invoice
        <div style={{ marginTop: 4, fontSize: 9, color: "#a07c2a" }}>
          Powered by Ashhu Digital · #{trackingId}
        </div>
      </div>
    </div>
  );
});

const th: React.CSSProperties = {
  padding: "8px 6px",
  textAlign: "left",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#1a1208",
  fontWeight: 800,
};
const td: React.CSSProperties = { padding: "8px 6px", verticalAlign: "middle" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        padding: "3px 0",
      }}
    >
      <span style={{ color: "#5a4520" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
