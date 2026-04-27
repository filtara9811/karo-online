import { createFileRoute, redirect } from "@tanstack/react-router";

const ROUTE_FOR: Record<string, string> = {
  quick: "/quick",
  vendor: "/register",
  all: "/vendors",
};

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    let target = "/quick";
    if (typeof window !== "undefined") {
      const pref = window.localStorage.getItem("ko-default-home");
      if (pref && ROUTE_FOR[pref]) target = ROUTE_FOR[pref];
    }
    throw redirect({ to: target });
  },
  component: () => null,
});
