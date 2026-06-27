"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Opens the onboarding chat popup on the landing page.
export function StartButton({ label = "Start Onboarding" }: { label?: string }) {
  return (
    <Button
      size="lg"
      onClick={() => window.dispatchEvent(new Event("mio:start-onboarding"))}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
