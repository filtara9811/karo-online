import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/referral/qr")({
  beforeLoad: () => {
    throw redirect({ to: "/one-qr" });
  },
});
