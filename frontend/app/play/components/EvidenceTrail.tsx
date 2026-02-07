"use client";

import { useEffect, useState } from "react";
import type { EvidenceItem } from "@/lib/api";
import Window from "@/components/Window";

export default function EvidenceTrail() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  useEffect(() => {
    const handleEvidenceUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setEvidence(detail);
    };

    window.addEventListener("finagotchi:evidence-update", handleEvidenceUpdate);
    return () => {
      window.removeEventListener(
        "finagotchi:evidence-update",
        handleEvidenceUpdate
      );
    };
  }, []);

  if (evidence.length === 0) return null;

  return (
    <Window title="evidence trail">
      <div className="p-2 max-h-48 overflow-y-auto">
        {evidence.slice(0, 5).map((item, i) => {
          const shortId = item.id?.split(":").pop()?.slice(0, 8) || `${i}`;
          return (
            <div
              key={item.id || i}
              className="text-xs border-b border-zinc-200 py-1 last:border-0"
            >
              <span className="font-bold font-mono text-zinc-500">
                [{shortId}]
              </span>{" "}
              <span className="text-zinc-700">
                {item.text.slice(0, 150)}
                {item.text.length > 150 ? "..." : ""}
              </span>
            </div>
          );
        })}
      </div>
    </Window>
  );
}
