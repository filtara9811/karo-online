import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RegistrationFlow } from "@/components/RegistrationFlow";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();

  return (
    <RegistrationFlow
      onBack={() => navigate({ to: "/" })}
      onComplete={() => navigate({ to: "/" })}
    />
  );
}
