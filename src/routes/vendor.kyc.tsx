import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KycStepFlow } from "@/components/KycStepFlow";
import { VendorAuthGate } from "@/components/VendorAuthGate";

export const Route = createFileRoute("/vendor/kyc")({
  head: () => ({ meta: [{ title: "Shop KYC — Vendor" }] }),
  component: () => (
    <VendorAuthGate>
      <VendorKycPage />
    </VendorAuthGate>
  ),
});

function VendorKycPage() {
  const navigate = useNavigate();
  return (
    <main
      className="min-h-dvh"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #04231a 60%, #053024 100%)" }}
    >
      <KycStepFlow
        subjectType="vendor"
        onClose={() => navigate({ to: "/vendor/dashboard" })}
      />
    </main>
  );
}
