"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { GraphData, GraphNode, GraphEdge, EvidenceItem } from "@/lib/api";
import Window from "@/components/Window";

// Cytoscape is loaded dynamically to avoid SSR issues
import type cytoscape_static from "cytoscape";
import type { Core as CyCore } from "cytoscape";
let cytoscape: (typeof cytoscape_static) | null = null;

// Retro-styled graph — light bg, dark borders, pixel-friendly colors
const GRAPH_STYLES = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "#d4d4d8",
      color: "#27272a",
      "font-size": "10px",
      "text-valign": "bottom" as const,
      "text-margin-y": 5,
      width: 22,
      height: 22,
      "border-width": 2,
      "border-color": "#18181b",
      shape: "rectangle" as const,
    },
  },
  {
    selector: 'node[type = "entity"]',
    style: {
      "background-color": "#99f6e4",
      "border-color": "#18181b",
    },
  },
  {
    selector: 'node[type = "transaction"]',
    style: {
      "background-color": "#bfdbfe",
      "border-color": "#18181b",
    },
  },
  {
    selector: 'node[type = "vendor"]',
    style: {
      "background-color": "#fde68a",
      "border-color": "#18181b",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": "#a1a1aa",
      "target-arrow-color": "#71717a",
      "target-arrow-shape": "triangle" as const,
      "curve-style": "bezier" as const,
      label: "data(label)",
      "font-size": "8px",
      color: "#71717a",
      "text-rotation": "autorotate" as const,
    },
  },
  {
    selector: 'edge[isOverlay = "true"]',
    style: {
      "line-color": "#f472b6",
      "target-arrow-color": "#f472b6",
      width: 2.5,
      "line-style": "dashed" as const,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": "#000000",
    },
  },
];

function buildElements(
  neighborhood: GraphData | null,
  overlay: GraphData | null
) {
  const nodeMap = new Map<string, GraphNode>();
  const edges: Array<GraphEdge & { isOverlay?: boolean }> = [];

  if (neighborhood) {
    neighborhood.nodes.forEach((n) => nodeMap.set(n.id, n));
    neighborhood.edges.forEach((e) => edges.push({ ...e, isOverlay: false }));
  }

  if (overlay) {
    overlay.nodes.forEach((n) => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
    });
    overlay.edges.forEach((e) => edges.push({ ...e, isOverlay: true }));
  }

  const cyNodes = Array.from(nodeMap.values()).map((n) => ({
    data: {
      id: n.id,
      label: n.label || n.id,
      type: n.type || "default",
    },
  }));

  const cyEdges = edges.map((e, i) => ({
    data: {
      id: e.id || `edge-${i}`,
      source: e.source,
      target: e.target,
      label: e.label || "",
      isOverlay: e.isOverlay ? "true" : "false",
    },
  }));

  return [...cyNodes, ...cyEdges];
}

// Seed graph shown before any backend interaction
const SEED_GRAPH: GraphData = {
  nodes: [
    { id: "agent", label: "finagotchi", type: "entity" },
    { id: "invoices", label: "invoices", type: "transaction" },
    { id: "expenses", label: "expenses", type: "transaction" },
    { id: "vendors", label: "vendors", type: "vendor" },
    { id: "compliance", label: "compliance", type: "entity" },
    { id: "anomalies", label: "anomalies", type: "entity" },
  ],
  edges: [
    { id: "e1", source: "agent", target: "invoices", label: "reviews" },
    { id: "e2", source: "agent", target: "expenses", label: "audits" },
    { id: "e3", source: "invoices", target: "vendors", label: "from" },
    { id: "e4", source: "agent", target: "compliance", label: "enforces" },
    { id: "e5", source: "expenses", target: "anomalies", label: "flags" },
  ],
};

export default function GraphPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<CyCore | null>(null);
  const [neighborhood, setNeighborhood] = useState<GraphData | null>(SEED_GRAPH);
  const [overlay, setOverlay] = useState<GraphData | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Listen for graph updates from the dilemma flow
  useEffect(() => {
    const handleGraphUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.neighborhood) setNeighborhood(detail.neighborhood);
      if (detail.overlay) setOverlay(detail.overlay);
    };

    const handleEvidenceUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setEvidence(detail);
    };

    window.addEventListener("finagotchi:graph-update", handleGraphUpdate);
    window.addEventListener(
      "finagotchi:evidence-update",
      handleEvidenceUpdate
    );

    return () => {
      window.removeEventListener("finagotchi:graph-update", handleGraphUpdate);
      window.removeEventListener(
        "finagotchi:evidence-update",
        handleEvidenceUpdate
      );
    };
  }, []);

  // Initialize and update cytoscape
  const initCy = useCallback(async () => {
    if (!containerRef.current) return;

    if (!cytoscape) {
      const mod = await import("cytoscape");
      cytoscape = mod.default ?? mod;
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements = buildElements(neighborhood, overlay);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: GRAPH_STYLES as any,
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 80,
        padding: 20,
      },
      maxZoom: 3,
      minZoom: 0.3,
      wheelSensitivity: 0.3,
      autoungrabify: false,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
    });

    // Tooltip on hover
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const pos = node.renderedPosition();
      setTooltip({
        text: `${node.data("type")}: ${node.data("label")}`,
        x: pos.x,
        y: pos.y - 30,
      });
    });

    cy.on("mouseout", "node", () => {
      setTooltip(null);
    });

    cyRef.current = cy;
  }, [neighborhood, overlay]);

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
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-col gap-2 w-full h-full"
    >
      {/* Graph container */}
      <div className="border-2 border-black bg-zinc-100 relative" style={{ height: "400px" }}>
        <div ref={containerRef} className="w-full" style={{ height: "100%" }} />
        {tooltip && (
          <div
            className="absolute bg-white border-2 border-black px-2 py-1 text-xs pointer-events-none z-20"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
          </div>
        )}
        {!neighborhood && !overlay && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            advise your agent to explore the knowledge graph
          </div>
        )}
        <div className="absolute bottom-1 right-2 text-[10px] text-zinc-400">
          {neighborhood?.nodes.length || 0} nodes
        </div>
      </div>

      {/* Evidence panel */}
      {evidence.length > 0 && (
        <Window title="evidence trail">
          <div className="p-2 max-h-40 overflow-y-auto">
            {evidence.slice(0, 5).map((item, i) => (
              <div
                key={item.id || i}
                className="text-xs border-b border-zinc-200 py-1 last:border-0"
              >
                <span className="font-bold font-mono">[{item.id}]</span>{" "}
                <span className="text-zinc-700">
                  {item.text.slice(0, 120)}
                  {item.text.length > 120 ? "..." : ""}
                </span>
                {item.score !== undefined && (
                  <span className="text-zinc-400 ml-1">
                    ({Math.round(item.score * 100)}%)
                  </span>
                )}
              </div>
            ))}
          </div>
        </Window>
      )}

      {/* Legend */}
      <div className="flex gap-3 text-xs text-zinc-500 px-1 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-teal-200 border-2 border-black inline-block" />
          entity
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-200 border-2 border-black inline-block" />
          transaction
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-amber-200 border-2 border-black inline-block" />
          vendor
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-pink-300 border-2 border-black inline-block" />
          overlay
        </span>
      </div>
    </motion.div>
  );
}
