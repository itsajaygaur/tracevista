"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { formatDuration } from "@/lib/format";
import type { TraceAnalysis } from "@/lib/types";

export function ServiceMap({ trace }: { trace: TraceAnalysis }) {
  const { nodes, edges } = useMemo(() => {
    const incoming = new Map(trace.serviceNodes.map((node) => [node.id, 0]));
    const outgoing = new Map<string, string[]>();
    for (const edge of trace.serviceEdges) {
      incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    }

    const layers = new Map<string, number>();
    const queue = [...incoming.entries()].filter(([, count]) => count === 0).map(([id]) => id);
    for (const id of queue) layers.set(id, 0);
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      const nextLayer = (layers.get(id) ?? 0) + 1;
      for (const target of outgoing.get(id) ?? []) {
        if (nextLayer > (layers.get(target) ?? -1)) layers.set(target, nextLayer);
        incoming.set(target, (incoming.get(target) ?? 1) - 1);
        if (incoming.get(target) === 0) queue.push(target);
      }
    }
    for (const node of trace.serviceNodes) {
      if (!layers.has(node.id)) layers.set(node.id, 0);
    }

    const nodesByLayer = new Map<number, string[]>();
    for (const node of trace.serviceNodes) {
      const layer = layers.get(node.id) ?? 0;
      nodesByLayer.set(layer, [...(nodesByLayer.get(layer) ?? []), node.id]);
    }

    const nodes: Node[] = trace.serviceNodes.map((node, index) => ({
      id: node.id,
      position: {
        x: (layers.get(node.id) ?? 0) * 230,
        y: (nodesByLayer.get(layers.get(node.id) ?? 0)?.indexOf(node.id) ?? index) * 112,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="min-w-36 p-1 text-left">
            <div className="text-xs font-semibold text-foreground">{node.id}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {node.spanCount} spans{node.errorCount ? ` · ${node.errorCount} errors` : ""}
            </div>
          </div>
        ),
      },
      style: {
        border: node.errorCount ? "1px solid color-mix(in oklab, #ef4444 55%, transparent)" : "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--card)",
        boxShadow: "var(--shadow-card)",
        color: "var(--foreground)",
        padding: 8,
      },
    }));

    const edges: Edge[] = trace.serviceEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: `${edge.callCount} call${edge.callCount === 1 ? "" : "s"} · p95 ${formatDuration(edge.p95Ms)}`,
      animated: edge.errorCount > 0,
      markerEnd: { type: MarkerType.ArrowClosed, color: edge.errorCount ? "#ef4444" : "#3b82f6" },
      style: { stroke: edge.errorCount ? "#ef4444" : "#3b82f6", strokeWidth: 1.5 },
      labelStyle: { fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: "var(--background)", fillOpacity: 0.85 },
      labelBgPadding: [5, 3],
      labelBgBorderRadius: 6,
      type: "smoothstep",
    }));
    return { nodes, edges };
  }, [trace]);

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border border-border bg-background/50" aria-label="Service dependency graph" data-testid="service-map">
      <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.25 }} nodesDraggable={false} nodesConnectable={false} elementsSelectable>
        <Background color="var(--border)" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
