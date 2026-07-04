import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * The old multi-step vendor register flow has been replaced by the new
 * one-screen + bottom-sheet Vendor Joining flow at `/vendor/join`.
 * Any legacy links or QR codes pointing here are redirected client-side.
 */
export const Route = createFileRoute("/vendor/register")({
  head: () => ({
    meta: [{ title: "Vendor Joining — Karo Online" }],
  }),
  component: VendorRegisterRedirect,
});

function VendorRegisterRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/vendor/join", replace: true });
  }, [navigate]);
  return null;
}
