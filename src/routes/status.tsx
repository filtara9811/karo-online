import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useOrdersStore } from "@/lib/orders-store";
import { VerticalOrderTimeline } from "@/components/VerticalOrderTimeline";

const searchSchema = z.object({
  vendorId: fallback(z.string(), "").default(""),
  orderId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/status")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Order Status — Karo Online" },
      { name: "description", content: "Live timeline for your service order with approvals and chat." },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { vendorId, orderId } = Route.useSearch();
  const navigate = useNavigate();
  const vendors = useOrdersStore();

  const vendor = vendors.find((v) => v.vendorId === vendorId) ?? vendors[0];
  const order =
    vendor?.orders.find((o) => o.id === orderId) ?? vendor?.orders[0];

  if (!vendor || !order) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white">
        <div className="text-center">
          <p className="text-slate-500 text-sm">No order selected.</p>
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="mt-3 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-bold"
          >
            Go to My Orders
          </button>
        </div>
      </div>
    );
  }

  return <VerticalOrderTimeline vendor={vendor} order={order} role="customer" />;
}
