"use client";

import { useEffect, useRef, useCallback } from "react";
import Menu from "@/components/Menu";
import Window from "@/components/Window";

import type cytoscape_static from "cytoscape";
import type { Core as CyCore } from "cytoscape";
let cytoscape: typeof cytoscape_static | null = null;

/* ── Fixed grid positions ── */

const COL = [150, 350, 550, 750];
const ROW_TOP = 70;
const ROW_MID = 190;
const ROW_BOT = 310;

const WORKFLOW_STYLES = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      color: "#18181b",
      "font-size": "11px",
      "font-family": "monospace",
      "text-valign": "center" as const,
      "text-halign": "center" as const,
      "border-width": 2,
      "border-color": "#18181b",
      shape: "rectangle" as const,
      "text-wrap": "wrap" as const,
      "text-max-width": "110px",
      "background-opacity": 1,
    },
  },
  {
    selector: 'node[type = "step"]',
    style: {
      "background-color": "#bfdbfe",
      width: 140,
      height: 44,
      "font-size": "13px",
      "font-weight": "bold",
    },
  },
  {
    selector: 'node[type = "tech"]',
    style: {
      "background-color": "#99f6e4",
      width: 110,
      height: 34,
      "font-size": "10px",
    },
  },
  {
    selector: 'node[type = "artifact"]',
    style: {
      "background-color": "#fde68a",
      width: 110,
      height: 34,
      "font-size": "10px",
    },
  },
  // Flow: solid blue
  {
    selector: 'edge[type = "flow"]',
    style: {
      width: 2.5,
      "line-color": "#3b82f6",
      "target-arrow-color": "#3b82f6",
      "target-arrow-shape": "triangle" as const,
      "curve-style": "straight" as const,
      "arrow-scale": 1.1,
    },
  },
  // Loop: dashed blue curved under
  {
    selector: 'edge[type = "loop"]',
    style: {
      width: 2,
      "line-color": "#3b82f6",
      "target-arrow-color": "#3b82f6",
      "target-arrow-shape": "triangle" as const,
      "curve-style": "unbundled-bezier" as const,
      "control-point-distances": [120],
      "control-point-weights": [0.5],
      "line-style": "dashed" as const,
      label: "data(label)",
      "font-size": "9px",
      "font-family": "monospace",
      color: "#3b82f6",
      "text-margin-y": 15,
    },
  },
  // Uses: thin gray
  {
    selector: 'edge[type = "uses"]',
    style: {
      width: 1.5,
      "line-color": "#d4d4d8",
      "target-arrow-color": "#a1a1aa",
      "target-arrow-shape": "triangle" as const,
      "curve-style": "straight" as const,
      "arrow-scale": 0.7,
      label: "data(label)",
      "font-size": "8px",
      "font-family": "monospace",
      color: "#a1a1aa",
      "text-rotation": "autorotate" as const,
    },
  },
];

const WORKFLOW_ELEMENTS = [
  // ── Steps (middle row) ──
  { data: { id: "s1", label: "1. Ingest", type: "step" }, position: { x: COL[0], y: ROW_MID } },
  { data: { id: "s2", label: "2. Runtime", type: "step" }, position: { x: COL[1], y: ROW_MID } },
  { data: { id: "s3", label: "3. Learn", type: "step" }, position: { x: COL[2], y: ROW_MID } },
  { data: { id: "s4", label: "4. Act", type: "step" }, position: { x: COL[3], y: ROW_MID } },

  // ── Ingest ──
  { data: { id: "snapshot", label: "Snapshot Data", type: "artifact" }, position: { x: COL[0], y: ROW_TOP } },
  { data: { id: "qdrant", label: "Qdrant", type: "tech" }, position: { x: COL[0] - 60, y: ROW_BOT } },
  { data: { id: "kuzu", label: "Kuzu", type: "tech" }, position: { x: COL[0] + 60, y: ROW_BOT } },

  // ── Runtime ──
  { data: { id: "fastapi", label: "FastAPI", type: "tech" }, position: { x: COL[1] - 60, y: ROW_TOP } },
  { data: { id: "llama", label: "Llama.cpp SLM", type: "tech" }, position: { x: COL[1] + 60, y: ROW_TOP } },
  { data: { id: "nextjs", label: "Next.js", type: "tech" }, position: { x: COL[1] - 60, y: ROW_BOT } },
  { data: { id: "do", label: "DigitalOcean", type: "tech" }, position: { x: COL[1] + 60, y: ROW_BOT } },

  // ── Learn ──
  { data: { id: "jsonl", label: "JSONL Logs", type: "artifact" }, position: { x: COL[2], y: ROW_TOP } },
  { data: { id: "distil", label: "Distil Labs", type: "tech" }, position: { x: COL[2], y: ROW_BOT } },

  // ── Act ──
  { data: { id: "petslm", label: "Pet SLM", type: "artifact" }, position: { x: COL[3], y: ROW_TOP } },
  { data: { id: "openclaw", label: "OpenClaw", type: "tech" }, position: { x: COL[3], y: ROW_BOT } },

  // ── Flow ──
  { data: { id: "f1", source: "s1", target: "s2", type: "flow" } },
  { data: { id: "f2", source: "s2", target: "s3", type: "flow" } },
  { data: { id: "f3", source: "s3", target: "s4", type: "flow" } },
  { data: { id: "f4", source: "s4", target: "s1", label: "feedback loop", type: "loop" } },

  // ── Uses ──
  { data: { id: "e1a", source: "snapshot", target: "s1", label: "load", type: "uses" } },
  { data: { id: "e1b", source: "s1", target: "qdrant", label: "vectors", type: "uses" } },
  { data: { id: "e1c", source: "s1", target: "kuzu", label: "graph", type: "uses" } },
  { data: { id: "e2a", source: "s2", target: "fastapi", type: "uses" } },
  { data: { id: "e2b", source: "s2", target: "llama", label: "SLM", type: "uses" } },
  { data: { id: "e2c", source: "s2", target: "nextjs", label: "UI", type: "uses" } },
  { data: { id: "e2d", source: "s2", target: "do", label: "deploy", type: "uses" } },
  { data: { id: "e3a", source: "s3", target: "jsonl", label: "export", type: "uses" } },
  { data: { id: "e3b", source: "distil", target: "s3", label: "fine-tune", type: "uses" } },
  { data: { id: "e4a", source: "petslm", target: "s4", type: "uses" } },
  { data: { id: "e4b", source: "s4", target: "openclaw", label: "agents", type: "uses" } },
];

export default function Workflow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<CyCore | null>(null);

  const initCy = useCallback(async () => {
    if (!containerRef.current) return;

    if (!cytoscape) {
      const mod = await import("cytoscape");
      cytoscape = mod.default ?? mod;
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: WORKFLOW_ELEMENTS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: WORKFLOW_STYLES as any,
      layout: { name: "preset" },
      autoungrabify: true,
      userPanningEnabled: false,
      userZoomingEnabled: false,
      boxSelectionEnabled: false,
      selectionType: "single",
      autounselectify: true,
    });

    cy.fit(undefined, 20);
    cyRef.current = cy;
  }, []);

  useEffect(() => {
    initCy();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initCy]);

  return (
    <div className="flex flex-col gap-2 p-4 w-full max-w-4xl mx-auto">
      <Menu page="workflow" />
      <Window title="how finagotchi works" isOpen={true}>
        <div className="flex flex-col gap-3 p-4">
          {/* Diagram */}
          <div className="bg-white border-2 border-zinc-200 aspect-[16/7]">
            <div ref={containerRef} className="w-full h-full" />
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-zinc-500 flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 bg-blue-200 border-2 border-black inline-block" />
              step
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 bg-teal-200 border-2 border-black inline-block" />
              technology
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-3 bg-amber-200 border-2 border-black inline-block" />
              artifact
            </span>
            <span className="flex items-center gap-1">
              <span className="w-6 border-t-2 border-blue-400 inline-block" />
              flow
            </span>
            <span className="flex items-center gap-1">
              <span className="w-6 border-t-2 border-dashed border-zinc-300 inline-block" />
              uses
            </span>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="border-2 border-zinc-200 p-3 bg-blue-50">
              <p className="font-bold font-mono">1. ingest</p>
              <p className="text-zinc-600 text-xs mt-1">
                load snapshot data into Qdrant (vectors) and build Kuzu graph
                (entities + relations).
              </p>
            </div>
            <div className="border-2 border-zinc-200 p-3 bg-blue-50">
              <p className="font-bold font-mono">2. runtime</p>
              <p className="text-zinc-600 text-xs mt-1">
                FastAPI + Llama.cpp SLM serves decisions; Next.js UI renders
                pet, evidence, and graph. deployed on DigitalOcean.
              </p>
            </div>
            <div className="border-2 border-zinc-200 p-3 bg-blue-50">
              <p className="font-bold font-mono">3. learn</p>
              <p className="text-zinc-600 text-xs mt-1">
                export interaction logs as JSONL to Distil Labs for SLM
                fine-tuning.
              </p>
            </div>
            <div className="border-2 border-zinc-200 p-3 bg-blue-50">
              <p className="font-bold font-mono">4. act</p>
              <p className="text-zinc-600 text-xs mt-1">
                use the fine-tuned &quot;Pet&quot; SLM inside OpenClaw agents to
                autonomously flag/approve/escalate transactions.
              </p>
            </div>
          </div>
        </div>
      </Window>
    </div>
  );
}
