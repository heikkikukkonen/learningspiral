"use client";

import Image from "next/image";
import Link from "next/link";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addThoughtTagAction,
  deleteThoughtFromNetworkAction,
  saveThoughtNetworkLayoutAction
} from "@/app/ajatusverkko/actions";
import type { ThoughtNetworkLayoutMap } from "@/lib/db";
import type { TagSuggestion } from "@/lib/types";

type ThoughtItem = {
  id: string;
  title: string;
  tags: string[];
  preview: string;
  idea: string;
  analysis: string;
  createdAt: string;
  hasCards: boolean;
  stageLabel: string;
};

type ThoughtNetworkViewProps = {
  thoughts: ThoughtItem[];
  initialManualPositions: ThoughtNetworkLayoutMap;
};

type ThoughtMenuState = {
  thoughtId: string;
};

type BaseNode = {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  width: number;
  height: number;
};

type ThoughtNode = BaseNode & {
  type: "thought";
  title: string;
  tags: string[];
  preview: string;
  idea: string;
  analysis: string;
  createdAt: string;
  hasCards: boolean;
  stageLabel: string;
};

type TagNode = BaseNode & {
  type: "tag";
  label: string;
  thoughtIds: string[];
};

type Node = ThoughtNode | TagNode;

type Edge = {
  id: string;
  from: string;
  to: string;
};

type TransformState = {
  x: number;
  y: number;
  scale: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  didMove: boolean;
};

type NodeDragState = {
  pointerId: number;
  nodeId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  didMove: boolean;
};

type ManualPositionMap = Record<string, { x: number; y: number }>;

const QUICK_CREATE_ACTIONS = [
  {
    title: "Kirjoita ajatus",
    href: "/capture?mode=text",
    iconSrc: "/brand/action-icons/KirjoitaAjatus.PNG"
  },
  {
    title: "Lisää kuva",
    href: "/capture?mode=image",
    iconSrc: "/brand/action-icons/TallennaKuva.PNG"
  },
  {
    title: "Sanele ajatus",
    href: "/capture?mode=voice",
    iconSrc: "/brand/action-icons/Sanele.PNG"
  }
] as const;

const STAGE_WIDTH = 2800;
const STAGE_HEIGHT = 2100;
const MIN_SCALE = 0.34;
const MAX_SCALE = 1.75;
const DEFAULT_TRANSFORM: TransformState = { x: 18, y: 16, scale: 0.42 };
const DRAG_THRESHOLD = 5;
const DRAG_CLICK_SUPPRESSION_MS = 220;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createDefaultTransform(viewport: HTMLDivElement | null): TransformState {
  if (!viewport) {
    return DEFAULT_TRANSFORM;
  }

  const rect = viewport.getBoundingClientRect();
  const scale = clamp(
    Math.min((rect.width - 56) / STAGE_WIDTH, (rect.height - 56) / STAGE_HEIGHT) * 1.18,
    MIN_SCALE,
    0.94
  );

  return {
    scale,
    x: rect.width / 2 - (STAGE_WIDTH * scale) / 2,
    y: rect.height / 2 - (STAGE_HEIGHT * scale) / 2
  };
}

function normalizeTagValue(value: string) {
  return value.trim().toLocaleLowerCase("fi-FI");
}

function dedupeLocalTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTag of tags) {
    const cleanedTag = rawTag.replace(/^#+/, "").trim();
    const normalizedTag = normalizeTagValue(cleanedTag);

    if (!normalizedTag || seen.has(normalizedTag)) continue;
    seen.add(normalizedTag);
    result.push(cleanedTag);
  }

  return result;
}

function buildTagSuggestions(thoughts: ThoughtItem[]): TagSuggestion[] {
  const aggregates = new Map<
    string,
    {
      tag: string;
      usageCount: number;
      lastUsedAt: string;
    }
  >();

  for (const thought of thoughts) {
    for (const tag of dedupeLocalTags(thought.tags)) {
      const normalizedTag = normalizeTagValue(tag);
      const current = aggregates.get(normalizedTag);

      if (!current) {
        aggregates.set(normalizedTag, {
          tag,
          usageCount: 1,
          lastUsedAt: thought.createdAt
        });
        continue;
      }

      current.usageCount += 1;
      if (thought.createdAt > current.lastUsedAt) {
        current.lastUsedAt = thought.createdAt;
        current.tag = tag;
      }
    }
  }

  const sorted = [...aggregates.values()].sort(
    (left, right) =>
      right.usageCount - left.usageCount ||
      right.lastUsedAt.localeCompare(left.lastUsedAt) ||
      left.tag.localeCompare(right.tag, "fi-FI")
  );
  const popularThreshold =
    sorted.length > 0 ? sorted[Math.min(5, sorted.length - 1)].usageCount : 0;

  return sorted.map((item, index) => ({
    tag: item.tag,
    usageCount: item.usageCount,
    lastUsedAt: item.lastUsedAt,
    isPopular: item.usageCount > 1 && index < 6 && item.usageCount >= popularThreshold
  }));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("fi-FI", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function polarToCartesian(angle: number, radiusX: number, radiusY: number) {
  return {
    x: Math.cos(angle) * radiusX,
    y: Math.sin(angle) * radiusY
  };
}

function averagePoint(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 };
  }

  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

function estimateTagSize(label: string) {
  return {
    width: clamp(48 + label.length * 6.8, 72, 160),
    height: 34
  };
}

function estimateThoughtSize(title: string) {
  const width = clamp(130 + Math.min(title.length, 44) * 2.35, 138, 216);
  const estimatedLines = clamp(Math.ceil(title.length / 20), 2, 4);
  const height = clamp(46 + estimatedLines * 14, 64, 104);

  return { width, height };
}

function keepNodeInsideStage<T extends BaseNode>(node: T): T {
  return {
    ...node,
    x: clamp(node.x, 24 + node.width / 2, STAGE_WIDTH - 24 - node.width / 2),
    y: clamp(node.y, 24 + node.height / 2, STAGE_HEIGHT - 24 - node.height / 2)
  };
}

function nodeGap(left: Node, right: Node) {
  if (left.type === "thought" && right.type === "thought") return 34;
  if (left.type === "tag" && right.type === "tag") return 20;
  return 28;
}

function buildGraph(thoughts: ThoughtItem[], layoutRevision = 0) {
  const tagMap = new Map<string, { label: string; thoughtIds: string[] }>();

  for (const thought of thoughts) {
    const resolvedTags = thought.tags.length ? thought.tags : ["Ilman tunnistetta"];
    for (const tag of resolvedTags) {
      const key = normalizeTagValue(tag);
      const current = tagMap.get(key);
      if (current) {
        current.thoughtIds.push(thought.id);
      } else {
        tagMap.set(key, { label: tag, thoughtIds: [thought.id] });
      }
    }
  }

  const tagEntries = [...tagMap.entries()].sort((left, right) => {
    const countDiff = right[1].thoughtIds.length - left[1].thoughtIds.length;
    if (countDiff) return countDiff;
    return left[1].label.localeCompare(right[1].label, "fi-FI");
  });

  const tagNodes: TagNode[] = tagEntries.map(([key, tag], index) => {
    const ringIndex = Math.floor(index / 14);
    const slotIndex = index % 14;
    const itemsInRing = Math.min(14, tagEntries.length - ringIndex * 14);
    const angleOffset = ((layoutRevision % 19) / 19) * (Math.PI / 7);
    const angle =
      -Math.PI / 2 + angleOffset + (slotIndex / Math.max(itemsInRing, 1)) * Math.PI * 2;
    const radiusX = 320 + ringIndex * 208;
    const radiusY = 240 + ringIndex * 156;
    const position = polarToCartesian(angle, radiusX, radiusY);
    const size = estimateTagSize(tag.label);

    return keepNodeInsideStage({
      id: `tag:${key}`,
      type: "tag",
      label: tag.label,
      thoughtIds: tag.thoughtIds,
      x: STAGE_WIDTH / 2 + position.x,
      y: STAGE_HEIGHT / 2 + position.y,
      homeX: STAGE_WIDTH / 2 + position.x,
      homeY: STAGE_HEIGHT / 2 + position.y,
      width: size.width,
      height: size.height
    });
  });

  const tagByKey = new Map(tagEntries.map(([key], index) => [key, tagNodes[index]]));
  const clusterCounts = new Map<string, number>();

  const thoughtNodes: ThoughtNode[] = thoughts.map((thought, index) => {
    const resolvedTags = thought.tags.length ? thought.tags : ["Ilman tunnistetta"];
    const connectedTagNodes = resolvedTags
      .map((tag) => tagByKey.get(normalizeTagValue(tag)))
      .filter((node): node is TagNode => Boolean(node));
    const anchor = averagePoint(connectedTagNodes);
    const primaryTag = [...resolvedTags].sort((left, right) => {
      const leftCount = tagMap.get(normalizeTagValue(left))?.thoughtIds.length ?? 0;
      const rightCount = tagMap.get(normalizeTagValue(right))?.thoughtIds.length ?? 0;
      return rightCount - leftCount;
    })[0];
    const primaryKey = normalizeTagValue(primaryTag);
    const clusterIndex = clusterCounts.get(primaryKey) ?? 0;
    clusterCounts.set(primaryKey, clusterIndex + 1);

    const fallbackAngle = ((index + 1) / Math.max(thoughts.length, 1)) * Math.PI * 2;
    const anchorAngle =
      connectedTagNodes[0]
        ? Math.atan2(anchor.y - STAGE_HEIGHT / 2, anchor.x - STAGE_WIDTH / 2)
        : fallbackAngle;
    const orbit = 110 + (clusterIndex % 4) * 28 + Math.floor(clusterIndex / 4) * 16;
    const jitterSeed = hashString(`${thought.id}:${layoutRevision}`);
    const jitterAngle = ((jitterSeed % 1000) / 1000) * 0.72 - 0.36;
    const jitterDistance = 16 + ((jitterSeed >> 4) % 38);
    const offset = polarToCartesian(
      anchorAngle + jitterAngle,
      orbit + jitterDistance,
      orbit * 0.72 + jitterDistance * 0.3
    );
    const size = estimateThoughtSize(thought.title);
    const growthWeight =
      (thought.hasCards ? 10 : 0) +
      Math.min(thought.tags.length, 4) * 4 +
      Math.min(thought.preview.length, 220) * 0.035;

    return keepNodeInsideStage({
      id: thought.id,
      type: "thought",
      title: thought.title,
      tags: resolvedTags,
      preview: thought.preview,
      idea: thought.idea,
      analysis: thought.analysis,
      createdAt: thought.createdAt,
      hasCards: thought.hasCards,
      stageLabel: thought.stageLabel,
      x: anchor.x + offset.x,
      y: anchor.y + offset.y,
      homeX: anchor.x + offset.x * 0.72,
      homeY: anchor.y + offset.y * 0.72,
      width: clamp(size.width + growthWeight * 0.62, 138, 228),
      height: clamp(size.height + growthWeight * 0.22, 66, 112)
    });
  });

  const thoughtById = new Set(thoughtNodes.map((thought) => thought.id));
  const edges: Edge[] = [];

  for (const tag of tagNodes) {
    for (const thoughtId of tag.thoughtIds) {
      if (!thoughtById.has(thoughtId)) continue;
      edges.push({
        id: `${tag.id}:${thoughtId}`,
        from: tag.id,
        to: thoughtId
      });
    }
  }

  return {
    thoughtNodes,
    tagNodes,
    nodes: [...tagNodes, ...thoughtNodes] as Node[],
    edges
  };
}

function relaxGraph(graph: ReturnType<typeof buildGraph>) {
  // Pakataan verkkoa kohti tunnisteankkureita, mutta puretaan laatikoiden paallekkaisyydet
  // iteratiivisella repulsiolla, jotta lopputulos pysyy orgaanisena eika mene ruudukoksi.
  const nodeById = new Map<string, Node>(
    graph.nodes.map((node) => [
      node.id,
      {
        ...node
      }
    ])
  );
  const thoughtEdgeMap = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const current = thoughtEdgeMap.get(edge.to) ?? [];
    current.push(edge.from);
    thoughtEdgeMap.set(edge.to, current);
  }

  const nodes = [...nodeById.values()];

  for (let iteration = 0; iteration < 240; iteration += 1) {
    for (let index = 0; index < nodes.length; index += 1) {
      const current = nodes[index];

      for (let nextIndex = index + 1; nextIndex < nodes.length; nextIndex += 1) {
        const next = nodes[nextIndex];
        let dx = next.x - current.x;
        let dy = next.y - current.y;
        const gap = nodeGap(current, next);
        const overlapX = current.width / 2 + next.width / 2 + gap - Math.abs(dx);
        const overlapY = current.height / 2 + next.height / 2 + gap - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (Math.abs(dx) < 0.0001) {
            dx = hashString(`${current.id}:${next.id}`) % 2 === 0 ? 1 : -1;
          }
          if (Math.abs(dy) < 0.0001) {
            dy = hashString(`${next.id}:${current.id}`) % 2 === 0 ? 1 : -1;
          }

          if (overlapX < overlapY) {
            const push = overlapX * 0.54;
            const direction = Math.sign(dx) || 1;
            current.x -= direction * push;
            next.x += direction * push;
          } else {
            const push = overlapY * 0.54;
            const direction = Math.sign(dy) || 1;
            current.y -= direction * push;
            next.y += direction * push;
          }
        } else {
          const distanceSquared = dx * dx + dy * dy;
          const repulsionRadius =
            current.width / 2 + next.width / 2 + Math.max(220, gap * 4);
          if (distanceSquared > 0.01 && distanceSquared < repulsionRadius * repulsionRadius) {
            const distance = Math.sqrt(distanceSquared);
            const force = ((repulsionRadius - distance) / repulsionRadius) * 0.28;
            const directionX = dx / distance;
            const directionY = dy / distance;
            current.x -= directionX * force;
            current.y -= directionY * force;
            next.x += directionX * force;
            next.y += directionY * force;
          }
        }
      }
    }

    for (const node of nodes) {
      if (node.type === "tag") {
        node.x += (node.homeX - node.x) * 0.085;
        node.y += (node.homeY - node.y) * 0.085;
      } else {
        const connectedTags = (thoughtEdgeMap.get(node.id) ?? [])
          .map((tagId) => nodeById.get(tagId))
          .filter((tag): tag is TagNode => Boolean(tag && tag.type === "tag"));
        const anchor = averagePoint(connectedTags);
        node.x += (anchor.x - node.x) * 0.042;
        node.y += (anchor.y - node.y) * 0.042;
        node.x += (node.homeX - node.x) * 0.012;
        node.y += (node.homeY - node.y) * 0.012;
      }

      node.x = clamp(node.x, 24 + node.width / 2, STAGE_WIDTH - 24 - node.width / 2);
      node.y = clamp(node.y, 24 + node.height / 2, STAGE_HEIGHT - 24 - node.height / 2);
    }
  }

  for (let pass = 0; pass < 36; pass += 1) {
    for (const thought of nodes.filter((node): node is ThoughtNode => node.type === "thought")) {
      for (const other of nodes) {
        if (other.id === thought.id) continue;

        let dx = thought.x - other.x;
        let dy = thought.y - other.y;
        const gap = nodeGap(thought, other) + 8;
        const overlapX = thought.width / 2 + other.width / 2 + gap - Math.abs(dx);
        const overlapY = thought.height / 2 + other.height / 2 + gap - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (Math.abs(dx) < 0.0001) {
          dx = hashString(`${thought.id}:${other.id}:x`) % 2 === 0 ? 1 : -1;
        }
        if (Math.abs(dy) < 0.0001) {
          dy = hashString(`${thought.id}:${other.id}:y`) % 2 === 0 ? 1 : -1;
        }

        if (overlapX < overlapY) {
          thought.x += (Math.sign(dx) || 1) * overlapX * 0.92;
        } else {
          thought.y += (Math.sign(dy) || 1) * overlapY * 0.92;
        }
      }

      const connectedTags = (thoughtEdgeMap.get(thought.id) ?? [])
        .map((tagId) => nodeById.get(tagId))
        .filter((tag): tag is TagNode => Boolean(tag && tag.type === "tag"));
      const anchor = averagePoint(connectedTags);
      thought.x += (anchor.x - thought.x) * 0.016;
      thought.y += (anchor.y - thought.y) * 0.016;
      thought.x = clamp(thought.x, 24 + thought.width / 2, STAGE_WIDTH - 24 - thought.width / 2);
      thought.y = clamp(thought.y, 24 + thought.height / 2, STAGE_HEIGHT - 24 - thought.height / 2);
    }
  }

  const tagNodes = graph.tagNodes.map((tag) => nodeById.get(tag.id) as TagNode);
  const thoughtNodes = graph.thoughtNodes.map((thought) => nodeById.get(thought.id) as ThoughtNode);

  return {
    ...graph,
    tagNodes,
    thoughtNodes,
    nodes: [...tagNodes, ...thoughtNodes] as Node[]
  };
}

export function ThoughtNetworkView({
  thoughts,
  initialManualPositions
}: ThoughtNetworkViewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const thoughtMenuRef = useRef<HTMLDivElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const nodeDragStateRef = useRef<NodeDragState | null>(null);
  const skipClickNodeIdRef = useRef<string | null>(null);
  const lastViewportDragEndedAtRef = useRef(0);
  const touchDistanceRef = useRef<number | null>(null);
  const touchScaleRef = useRef<number>(DEFAULT_TRANSFORM.scale);
  const [thoughtItems, setThoughtItems] = useState(thoughts);
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(thoughts[0]?.id ?? null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [manualPositions, setManualPositions] = useState<ManualPositionMap>(
    initialManualPositions
  );
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [thoughtMenu, setThoughtMenu] = useState<ThoughtMenuState | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [menuFeedback, setMenuFeedback] = useState("");
  const [pendingMenuAction, setPendingMenuAction] = useState<"tag" | "delete" | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedLayoutRef = useRef<string>(JSON.stringify(initialManualPositions));
  const queuedLayoutRef = useRef<{
    serialized: string;
    layout: ManualPositionMap;
  } | null>(null);
  const isSavingLayoutRef = useRef(false);

  const graph = useMemo(
    () => relaxGraph(buildGraph(thoughtItems, layoutRevision)),
    [thoughtItems, layoutRevision]
  );
  const semanticZoom = useMemo(() => {
    const spread = 1 + Math.max(0, transform.scale - 1) * 0.48;
    const nodeScale = 1 / (1 + Math.max(0, transform.scale - 1) * 0.38);

    function point(x: number, y: number) {
      return {
        x: STAGE_WIDTH / 2 + (x - STAGE_WIDTH / 2) * spread,
        y: STAGE_HEIGHT / 2 + (y - STAGE_HEIGHT / 2) * spread
      };
    }

    return {
      spread,
      nodeScale,
      point
    };
  }, [transform.scale]);

  const resolvedGraph = useMemo(() => {
    const tagNodes = graph.tagNodes.map((tag) => {
      const manual = manualPositions[tag.id];
      return manual ? keepNodeInsideStage({ ...tag, ...manual }) : tag;
    });
    const thoughtNodes = graph.thoughtNodes.map((thought) => {
      const manual = manualPositions[thought.id];
      return manual ? keepNodeInsideStage({ ...thought, ...manual }) : thought;
    });
    const nodeMap = new Map<string, Node>([...tagNodes, ...thoughtNodes].map((node) => [node.id, node]));

    return {
      ...graph,
      tagNodes,
      thoughtNodes,
      nodes: [...tagNodes, ...thoughtNodes] as Node[],
      nodeMap
    };
  }, [graph, manualPositions]);

  const selectedNode = selectedNodeId ? resolvedGraph.nodeMap.get(selectedNodeId) ?? null : null;

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>([selectedNode.id]);

    if (selectedNode.type === "thought") {
      for (const edge of resolvedGraph.edges) {
        if (edge.to === selectedNode.id) ids.add(edge.from);
      }
    } else {
      for (const thoughtId of selectedNode.thoughtIds) {
        ids.add(thoughtId);
      }
    }

    return ids;
  }, [resolvedGraph.edges, selectedNode]);

  function nodeZIndex(input: {
    nodeType: Node["type"];
    isSelected: boolean;
    isConnected: boolean;
    isDragging: boolean;
  }) {
    if (input.isDragging) return 120;
    if (input.isSelected) return 110;
    if (selectedNodeId !== null && input.isConnected) {
      return input.nodeType === "thought" ? 100 : 96;
    }
    return input.nodeType === "thought" ? 20 : 12;
  }

  const hoveredEdgeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const edge of resolvedGraph.edges) {
      if (edge.from === hoveredNodeId || edge.to === hoveredNodeId) ids.add(edge.id);
    }
    return ids;
  }, [resolvedGraph.edges, hoveredNodeId]);

  const relatedThoughts =
    selectedNode?.type === "tag"
      ? selectedNode.thoughtIds
          .map((thoughtId) => resolvedGraph.nodeMap.get(thoughtId))
          .filter((node): node is ThoughtNode => Boolean(node && node.type === "thought"))
      : [];
  const tagSuggestions = useMemo(() => buildTagSuggestions(thoughtItems), [thoughtItems]);
  const menuThought = thoughtMenu
    ? thoughtItems.find((thought) => thought.id === thoughtMenu.thoughtId) ?? null
    : null;
  const selectedMenuTags = new Set((menuThought?.tags ?? []).map((tag) => normalizeTagValue(tag)));
  const availableTagSuggestions = tagSuggestions.filter(
    (suggestion) => !selectedMenuTags.has(normalizeTagValue(suggestion.tag))
  );
  const normalizedTagInput = normalizeTagValue(tagInput);
  const matchingTagSuggestions = normalizedTagInput
    ? availableTagSuggestions.filter((suggestion) => {
        const normalizedSuggestion = normalizeTagValue(suggestion.tag);
        return (
          normalizedSuggestion.startsWith(normalizedTagInput) ||
          normalizedSuggestion.includes(normalizedTagInput) ||
          normalizedTagInput.includes(normalizedSuggestion)
        );
      })
    : [];
  const orderedMatchingTagSuggestions = [...matchingTagSuggestions].sort(
    (left, right) =>
      Number(normalizeTagValue(right.tag).startsWith(normalizedTagInput)) -
        Number(normalizeTagValue(left.tag).startsWith(normalizedTagInput)) ||
      right.usageCount - left.usageCount ||
      right.lastUsedAt.localeCompare(left.lastUsedAt)
  );
  const tagAutocompleteOptions = (normalizedTagInput
    ? orderedMatchingTagSuggestions
    : availableTagSuggestions
  )
    .slice(0, 12)
    .sort(
      (left, right) =>
        right.usageCount - left.usageCount ||
        right.lastUsedAt.localeCompare(left.lastUsedAt) ||
        left.tag.localeCompare(right.tag, "fi-FI")
    );

  const menuIdea = menuThought?.idea.trim() ?? "";
  const menuAnalysis = menuThought?.analysis.trim() ?? "";
  const menuPreview = menuThought?.preview.trim() ?? "";
  const menuBodyCopy = menuIdea || menuPreview || "Ajatusta ei ole viela kirjoitettu.";
  const menuAnalysisCopy =
    menuAnalysis ||
    (menuIdea && menuPreview !== menuIdea
      ? menuPreview
      : "Syvennysta ei ole viela lisatty.");
  const isMenuDeletePending = pendingMenuAction === "delete";
  const visibleTagSuggestions = tagAutocompleteOptions;

  function closeThoughtMenu() {
    setThoughtMenu(null);
    setTagInput("");
    setMenuFeedback("");
    setPendingMenuAction(null);
  }

  function queueLayoutSave(layout: ManualPositionMap, serialized: string) {
    queuedLayoutRef.current = {
      serialized,
      layout
    };

    if (isSavingLayoutRef.current) {
      return;
    }

    const runNextSave = async () => {
      const next = queuedLayoutRef.current;
      if (!next) {
        isSavingLayoutRef.current = false;
        return;
      }

      queuedLayoutRef.current = null;
      isSavingLayoutRef.current = true;

      try {
        const savedLayout = await saveThoughtNetworkLayoutAction(next.layout);
        lastSavedLayoutRef.current = JSON.stringify(savedLayout);
      } catch (error) {
        console.error("[ajatusverkko] layout save failed", error);
      } finally {
        if (queuedLayoutRef.current) {
          void runNextSave();
        } else {
          isSavingLayoutRef.current = false;
        }
      }
    };

    void runNextSave();
  }

  function rearrangeLayout() {
    if (
      !window.confirm(
        "Järjestetäänkö verkko uudelleen? Käsin siirtämäsi sijainnit korvataan uudella automaattisella asettelulla."
      )
    ) {
      return;
    }

    setManualPositions({});
    setDraggingNodeId(null);
    skipClickNodeIdRef.current = null;
    setLayoutRevision((current) => current + 1);
    closeThoughtMenu();
  }

  function openThoughtMenu(thoughtId: string) {
    setSelectedNodeId(thoughtId);
    setTagInput("");
    setMenuFeedback("");
    setThoughtMenu({
      thoughtId
    });
  }

  useEffect(() => {
    setThoughtItems(thoughts);
  }, [thoughts]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextTransform = createDefaultTransform(viewportRef.current);
      setTransform(nextTransform);
      touchScaleRef.current = nextTransform.scale;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    setManualPositions((current) => {
      let changed = false;
      const nextEntries = Object.entries(current).filter(([nodeId]) => {
        const keep = nodeIds.has(nodeId);
        if (!keep) changed = true;
        return keep;
      });

      return changed ? Object.fromEntries(nextEntries) : current;
    });
  }, [graph]);

  useEffect(() => {
    const serializedLayout = JSON.stringify(manualPositions);
    if (serializedLayout === lastSavedLayoutRef.current) {
      return;
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      queueLayoutSave(manualPositions, serializedLayout);
    }, 700);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [manualPositions]);

  useEffect(() => {
    if (!menuThought && thoughtMenu) {
      setThoughtMenu(null);
      setTagInput("");
      setMenuFeedback("");
      setPendingMenuAction(null);
    }
  }, [menuThought, thoughtMenu]);

  useEffect(() => {
    if (!hoveredNodeId || selectedNodeId === null) return;
    if (connectedNodeIds.has(hoveredNodeId)) return;
    setHoveredNodeId(null);
  }, [connectedNodeIds, hoveredNodeId, selectedNodeId]);

  useEffect(() => {
    if (!thoughtMenu) return;

    const frame = window.requestAnimationFrame(() => {
      tagInputRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeThoughtMenu();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [thoughtMenu]);

  function updateScale(nextScale: number, clientX?: number, clientY?: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      setTransform((current) => ({ ...current, scale: nextScale }));
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const originX = clientX ?? rect.left + rect.width / 2;
    const originY = clientY ?? rect.top + rect.height / 2;
    const pointX = (originX - rect.left - transform.x) / transform.scale;
    const pointY = (originY - rect.top - transform.y) / transform.scale;

    setTransform({
      scale: nextScale,
      x: originX - rect.left - pointX * nextScale,
      y: originY - rect.top - pointY * nextScale
    });
  }

  function handleNodePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = nodeDragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const node = resolvedGraph.nodeMap.get(drag.nodeId);
    if (!node) return;

    const stageFactor = Math.max(transform.scale * semanticZoom.spread, 0.001);
    const deltaX = (event.clientX - drag.startX) / stageFactor;
    const deltaY = (event.clientY - drag.startY) / stageFactor;
    const travel = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (!drag.didMove && travel <= DRAG_THRESHOLD) {
      return;
    }
    if (!drag.didMove) {
      drag.didMove = true;
      skipClickNodeIdRef.current = drag.nodeId;
    }

    setManualPositions((current) => ({
      ...current,
      [drag.nodeId]: {
        x: clamp(drag.originX + deltaX, 24 + node.width / 2, STAGE_WIDTH - 24 - node.width / 2),
        y: clamp(drag.originY + deltaY, 24 + node.height / 2, STAGE_HEIGHT - 24 - node.height / 2)
      }
    }));
  }

  function clearNodeDrag(pointerId: number) {
    const drag = nodeDragStateRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    nodeDragStateRef.current = null;
    setDraggingNodeId(null);

    if (drag.didMove) {
      window.setTimeout(() => {
        if (skipClickNodeIdRef.current === drag.nodeId) {
          skipClickNodeIdRef.current = null;
        }
      }, 0);
    }
  }

  function clearViewportDrag(pointerId: number) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragStateRef.current = null;

    if (drag.didMove) {
      lastViewportDragEndedAtRef.current = performance.now();
    }
  }

  async function handleAddTag(nextValue?: string) {
    if (!menuThought) return;

    const cleanedValue = (nextValue ?? tagInput).replace(/^#+/, "").trim();
    if (!cleanedValue) {
      setMenuFeedback("Kirjoita tunniste ennen lisäämistä.");
      return;
    }

    const existingSuggestion =
      availableTagSuggestions.find(
        (suggestion) =>
          normalizeTagValue(suggestion.tag) === normalizeTagValue(cleanedValue)
      ) ?? null;
    const resolvedTag = existingSuggestion?.tag ?? cleanedValue;

    setPendingMenuAction("tag");
    setMenuFeedback("");

    try {
      const formData = new FormData();
      formData.set("sourceId", menuThought.id);
      formData.set("tag", resolvedTag);

      const result = await addThoughtTagAction(formData);

      setThoughtItems((current) =>
        current.map((thought) =>
          thought.id === menuThought.id
            ? {
                ...thought,
                tags: result.tags,
                stageLabel: result.stageLabel
              }
            : thought
        )
      );
      setTagInput("");
      setMenuFeedback(
        existingSuggestion
          ? `Tunniste "${result.tag}" liitettiin ajatukseen.`
          : `Lisättiin uusi tunniste "${result.tag}".`
      );
    } catch (error) {
      setMenuFeedback(
        error instanceof Error ? error.message : "Tunnisteen lisääminen epäonnistui."
      );
    } finally {
      setPendingMenuAction(null);
    }
  }

  async function handleDeleteThought(thoughtId: string) {
    const shouldDelete = window.confirm(
      "Poistetaanko ajatus pysyvästi? Tämä poistaa myös siihen liittyvät tehtävät."
    );
    if (!shouldDelete) return;

    setPendingMenuAction("delete");
    setMenuFeedback("");

    try {
      const formData = new FormData();
      formData.set("sourceId", thoughtId);
      await deleteThoughtFromNetworkAction(formData);

      setThoughtItems((current) => current.filter((thought) => thought.id !== thoughtId));
      setSelectedNodeId((current) => (current === thoughtId ? null : current));
      setHoveredNodeId((current) => (current === thoughtId ? null : current));
      closeThoughtMenu();
    } catch (error) {
      setMenuFeedback(
        error instanceof Error ? error.message : "Ajatuksen poistaminen epäonnistui."
      );
      setPendingMenuAction(null);
    }
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const zoomDelta = event.deltaY < 0 ? 0.12 : -0.12;

      setTransform((current) => {
        const nextScale = clamp(current.scale + zoomDelta, MIN_SCALE, MAX_SCALE);
        if (nextScale === current.scale) return current;
        if (!viewport) return current;

        const rect = viewport.getBoundingClientRect();
        const originX = event.clientX ?? rect.left + rect.width / 2;
        const originY = event.clientY ?? rect.top + rect.height / 2;
        const pointX = (originX - rect.left - current.x) / current.scale;
        const pointY = (originY - rect.top - current.y) / current.scale;

        return {
          scale: nextScale,
          x: originX - rect.left - pointX * nextScale,
          y: originY - rect.top - pointY * nextScale
        };
      });
    }

    function preventGesture(event: Event) {
      event.preventDefault();
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("gesturestart", preventGesture, { passive: false } as AddEventListenerOptions);
    viewport.addEventListener("gesturechange", preventGesture, { passive: false } as AddEventListenerOptions);
    viewport.addEventListener("gestureend", preventGesture, { passive: false } as AddEventListenerOptions);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("gesturestart", preventGesture);
      viewport.removeEventListener("gesturechange", preventGesture);
      viewport.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isExpanded || thoughtMenu !== null) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded, thoughtMenu]);

  return (
    <div className={`thought-network-shell${isExpanded ? " is-expanded" : ""}`}>
      <div className="thought-network-stage-card">
        <div className="thought-network-stage-header">
          <div>
            <p className="thoughts-eyebrow">Ajatusten tila</p>
            <p className="muted thought-network-stage-copy">
              Klikkaa ajatusta fokukseen. Vedä taustaa liikkuaksesi, zoomaa rullalla tai nipistyksellä.
            </p>
          </div>
          <div className="thought-network-stage-actions">
            <button
              type="button"
              className="thought-network-icon-button"
              onClick={() => setIsExpanded((current) => !current)}
              aria-label={isExpanded ? "Supista verkkonäkymä" : "Laajenna verkkonäkymä"}
              title={isExpanded ? "Supista" : "Laajenna"}
            >
              {isExpanded ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M8 4H4v4M16 4h4v4M8 20H4v-4M20 20h-4v-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="button-link secondary"
              onClick={() => rearrangeLayout()}
            >
              Järjestä uudelleen
            </button>
            <Link href="/app" className="button-link secondary">
              Uusi ajatus
            </Link>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="thought-network-viewport"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("[data-network-node]")) return;
            dragStateRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: transform.x,
              originY: transform.y,
              didMove: false
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const dragState = dragStateRef.current;
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            const travel =
              Math.abs(event.clientX - dragState.startX) + Math.abs(event.clientY - dragState.startY);

            if (!dragState.didMove && travel <= DRAG_THRESHOLD) {
              return;
            }

            if (!dragState.didMove) {
              dragState.didMove = true;
            }

            setTransform((current) => ({
              ...current,
              x: dragState.originX + (event.clientX - dragState.startX),
              y: dragState.originY + (event.clientY - dragState.startY)
            }));
          }}
          onPointerUp={(event) => clearViewportDrag(event.pointerId)}
          onPointerCancel={(event) => clearViewportDrag(event.pointerId)}
          onTouchMove={(event) => {
            if (event.touches.length !== 2) {
              touchDistanceRef.current = null;
              touchScaleRef.current = transform.scale;
              return;
            }

            event.preventDefault();
            const [first, second] = [event.touches[0], event.touches[1]];
            const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

            if (!touchDistanceRef.current) {
              touchDistanceRef.current = distance;
              touchScaleRef.current = transform.scale;
              return;
            }

            const nextScale = clamp(
              touchScaleRef.current * (distance / touchDistanceRef.current),
              MIN_SCALE,
              MAX_SCALE
            );
            updateScale(nextScale, (first.clientX + second.clientX) / 2, (first.clientY + second.clientY) / 2);
          }}
          onTouchEnd={() => {
            touchDistanceRef.current = null;
            touchScaleRef.current = transform.scale;
          }}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("[data-network-node]")) return;
            if (performance.now() - lastViewportDragEndedAtRef.current < DRAG_CLICK_SUPPRESSION_MS) {
              return;
            }
            setSelectedNodeId(null);
            closeThoughtMenu();
          }}
        >
          <div
            className="thought-network-stage"
            style={{
              width: `${STAGE_WIDTH}px`,
              height: `${STAGE_HEIGHT}px`,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
            }}
          >
            <svg className="thought-network-edges" viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} aria-hidden="true">
              {resolvedGraph.edges.map((edge) => {
                const from = resolvedGraph.nodeMap.get(edge.from);
                const to = resolvedGraph.nodeMap.get(edge.to);
                if (!from || !to) return null;
                const fromPoint = semanticZoom.point(from.x, from.y);
                const toPoint = semanticZoom.point(to.x, to.y);

                const isSelected =
                  selectedNodeId !== null && (selectedNodeId === edge.from || selectedNodeId === edge.to);
                const isHovered = hoveredEdgeIds.has(edge.id);
                const isDimmed = selectedNodeId !== null && !isSelected;

                return (
                  <line
                    key={edge.id}
                    x1={fromPoint.x}
                    y1={fromPoint.y}
                    x2={toPoint.x}
                    y2={toPoint.y}
                    className={`thought-network-edge${isSelected ? " is-selected" : ""}${isHovered ? " is-hovered" : ""}${isDimmed ? " is-dimmed" : ""}`}
                  />
                );
              })}
            </svg>

            {resolvedGraph.tagNodes.map((tag) => {
              const isSelected = selectedNodeId === tag.id;
              const isConnected = connectedNodeIds.has(tag.id);
              const isDimmed = selectedNodeId !== null && !isConnected;
              const isDragging = draggingNodeId === tag.id;
              const point = semanticZoom.point(tag.x, tag.y);
              const tagHeight = tag.height * semanticZoom.nodeScale;
              const tagWidth = tag.width * semanticZoom.nodeScale;

              return (
                <button
                  key={tag.id}
                  type="button"
                  data-network-node="true"
                  className={`thought-network-node thought-network-tag${isSelected ? " is-selected" : ""}${isDimmed ? " is-dimmed" : ""}${draggingNodeId === tag.id ? " is-dragging" : ""}`}
                  style={{
                    left: `${point.x}px`,
                    top: `${point.y}px`,
                    width: `${tagWidth}px`,
                    height: `${tagHeight}px`,
                    zIndex: nodeZIndex({
                      nodeType: "tag",
                      isSelected,
                      isConnected,
                      isDragging
                    })
                  }}
                  onPointerDown={(event) => {
                    if (isDimmed) return;
                    event.stopPropagation();
                    nodeDragStateRef.current = {
                      pointerId: event.pointerId,
                      nodeId: tag.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      originX: tag.x,
                      originY: tag.y,
                      didMove: false
                    };
                    setDraggingNodeId(tag.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={(event) => clearNodeDrag(event.pointerId)}
                  onPointerCancel={(event) => clearNodeDrag(event.pointerId)}
                  onClick={() => {
                    if (isDimmed) return;
                    if (skipClickNodeIdRef.current === tag.id) {
                      skipClickNodeIdRef.current = null;
                      return;
                    }
                    closeThoughtMenu();
                    setSelectedNodeId(tag.id);
                  }}
                  onMouseEnter={() => {
                    if (isDimmed) return;
                    setHoveredNodeId(tag.id);
                  }}
                  onMouseLeave={() => setHoveredNodeId((current) => (current === tag.id ? null : current))}
                >
                  <span className="thought-network-tag-mark" aria-hidden="true">#</span>
                  <span className="thought-network-tag-label">{tag.label}</span>
                </button>
              );
            })}

            {resolvedGraph.thoughtNodes.map((thought) => {
              const isSelected = selectedNodeId === thought.id;
              const isConnected = connectedNodeIds.has(thought.id);
              const isDimmed = selectedNodeId !== null && !isConnected;
              const isDragging = draggingNodeId === thought.id;
              const point = semanticZoom.point(thought.x, thought.y);
              const thoughtWidth = thought.width * semanticZoom.nodeScale;
              const thoughtHeight = thought.height * semanticZoom.nodeScale;

              return (
                <button
                  key={thought.id}
                  type="button"
                  data-network-node="true"
                  className={`thought-network-node thought-network-thought${isSelected ? " is-selected" : ""}${isDimmed ? " is-dimmed" : ""}${draggingNodeId === thought.id ? " is-dragging" : ""}`}
                  style={{
                    left: `${point.x}px`,
                    top: `${point.y}px`,
                    width: `${thoughtWidth}px`,
                    height: `${thoughtHeight}px`,
                    zIndex: nodeZIndex({
                      nodeType: "thought",
                      isSelected,
                      isConnected,
                      isDragging
                    })
                  }}
                  onPointerDown={(event) => {
                    if (isDimmed) return;
                    event.stopPropagation();
                    nodeDragStateRef.current = {
                      pointerId: event.pointerId,
                      nodeId: thought.id,
                      startX: event.clientX,
                      startY: event.clientY,
                      originX: thought.x,
                      originY: thought.y,
                      didMove: false
                    };
                    setDraggingNodeId(thought.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={(event) => clearNodeDrag(event.pointerId)}
                  onPointerCancel={(event) => clearNodeDrag(event.pointerId)}
                  onClick={() => {
                    if (isDimmed) return;
                    if (skipClickNodeIdRef.current === thought.id) {
                      skipClickNodeIdRef.current = null;
                      return;
                    }
                    closeThoughtMenu();
                    setSelectedNodeId(thought.id);
                  }}
                  onDoubleClick={(event) => {
                    if (isDimmed) return;
                    event.preventDefault();
                    event.stopPropagation();
                    openThoughtMenu(thought.id);
                  }}
                  onMouseEnter={() => {
                    if (isDimmed) return;
                    setHoveredNodeId(thought.id);
                  }}
                  onMouseLeave={() => setHoveredNodeId((current) => (current === thought.id ? null : current))}
                >
                  <span>{thought.title}</span>
                </button>
              );
            })}

            {thoughtMenu && menuThought && typeof document !== "undefined" ? createPortal(
              <div className="thought-network-modal-backdrop" onPointerDown={() => closeThoughtMenu()}>
                <div
                  ref={thoughtMenuRef}
                  className="thought-network-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="thought-network-modal-title"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="thought-network-modal-header">
                        <div className="thought-network-menu-header">
                          <span className="pill" data-variant="primary">
                            Ajatus
                          </span>
                          <strong id="thought-network-modal-title">{menuThought.title}</strong>
                        </div>

                    <button
                      type="button"
                      className="thought-network-icon-button"
                      onClick={() => closeThoughtMenu()}
                      aria-label="Sulje ajatuksen tiedot"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M6 6l12 12M18 6 6 18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="thought-network-modal-body">
                    <div className="thought-network-modal-main">
                      <article className="card review-thought-panel thought-network-modal-thought-panel">
                        <div className="source-meta">
                          <span className="pill">{menuThought.stageLabel}</span>
                        </div>

                        {menuThought.tags.length ? (
                          <div className="review-tag-list">
                            {menuThought.tags.map((tag) => (
                              <span key={tag} className="tag-chip tag-chip-network tag-chip-inline">
                                <span className="tag-chip-mark" aria-hidden="true">
                                  #
                                </span>
                                <span>{tag}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <h3 className="review-thought-title">{menuThought.title}</h3>

                        {menuBodyCopy ? <div className="review-thought-block">{menuBodyCopy}</div> : null}
                        {menuAnalysisCopy && menuAnalysisCopy !== menuBodyCopy ? (
                          <div className="review-thought-block review-thought-block-analysis">
                            {menuAnalysisCopy}
                          </div>
                        ) : null}
                      </article>
                    </div>

                    <aside className="thought-network-modal-side">

                <div className="thought-network-menu-section">
                  <label className="thought-network-menu-label" htmlFor="thought-network-tag-input">
                    Lisää tagi
                  </label>
                  <div className="thought-network-menu-input-row">
                    <input
                      id="thought-network-tag-input"
                      ref={tagInputRef}
                      list="thought-network-tag-options"
                      value={tagInput}
                      autoComplete="off"
                      onChange={(event) => {
                        setTagInput(event.target.value);
                        setMenuFeedback("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleAddTag();
                        }
                      }}
                      placeholder="Kirjoita tunniste"
                      disabled={pendingMenuAction !== null}
                    />
                    <button
                      type="button"
                      className="button-link secondary thought-network-menu-add-button"
                      onClick={() => void handleAddTag()}
                      disabled={pendingMenuAction !== null}
                    >
                      Lisää
                    </button>
                  </div>

                  <datalist id="thought-network-tag-options">
                    {tagAutocompleteOptions.map((suggestion) => (
                      <option key={`${suggestion.tag}-${suggestion.lastUsedAt}`} value={suggestion.tag} />
                    ))}
                  </datalist>

                  {visibleTagSuggestions.length > 0 ? (
                    <div className="thought-network-menu-suggestions">
                      {visibleTagSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.tag}-${suggestion.lastUsedAt}`}
                          type="button"
                          className="thought-network-menu-suggestion"
                          onClick={() => void handleAddTag(suggestion.tag)}
                          disabled={pendingMenuAction !== null}
                        >
                          <span className="thought-network-menu-suggestion-tag">#{suggestion.tag}</span>
                          <span className="thought-network-menu-suggestion-meta">{suggestion.usageCount}x</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="thought-network-menu-actions">
                  <Link
                    href={`/sources/${menuThought.id}?backTo=/ajatusverkko`}
                    className="thought-network-menu-item"
                    onClick={() => closeThoughtMenu()}
                  >
                    <span className="thought-network-menu-item-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M4 20h4l10-10-4-4L4 16v4zm10-12 4 4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="thought-network-menu-item-copy">
                      <strong>Muokkaa ajatusta</strong>
                      <span>Avaa ajatus editorissa</span>
                    </span>
                  </Link>

                  <button
                    type="button"
                    className="thought-network-menu-item is-danger"
                    onClick={() => void handleDeleteThought(menuThought.id)}
                    disabled={pendingMenuAction !== null}
                  >
                    <span className="thought-network-menu-item-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M5 7h14M10 11v5M14 11v5M8 7l1-2h6l1 2M7 7l1 12h8l1-12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="thought-network-menu-item-copy">
                      <strong>{isMenuDeletePending ? "Poistetaan..." : "Poista ajatus"}</strong>
                      <span>Poistaa ajatuksen ja siihen liittyvät tehtävät</span>
                    </span>
                  </button>
                </div>

                <div className="thought-network-menu-divider" aria-hidden="true" />

                <div className="thought-network-menu-section">
                  <span className="thought-network-menu-label">Luo uusi ajatus</span>
                  <div className="thought-network-quick-create">
                    {QUICK_CREATE_ACTIONS.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="thought-network-quick-create-card"
                        onClick={() => closeThoughtMenu()}
                      >
                        <span className="thought-network-quick-create-icon" aria-hidden="true">
                          <Image src={action.iconSrc} alt="" width={44} height={44} />
                        </span>
                        <span>{action.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {menuFeedback ? (
                  <p className="thought-network-menu-feedback" role="status">
                    {menuFeedback}
                  </p>
                ) : null}
                    </aside>
                  </div>
                </div>
              </div>,
              document.body
            ) : null}
          </div>
        </div>

        <div className="thought-network-stage-footer">
          <span className="pill">{resolvedGraph.thoughtNodes.length} ajatusta</span>
          <span className="pill">{resolvedGraph.tagNodes.length} tunnistesolmua</span>
          <span className="pill">Vedä solmua siirtääksesi sitä käsin</span>
        </div>
      </div>

      <aside className="thought-network-detail-panel">
        {selectedNode?.type === "thought" ? (
          <>
            <div className="thought-network-detail-header">
              <span className="pill" data-variant="primary">
                Ajatus
              </span>
              <h3>{selectedNode.title}</h3>
              <p className="muted">
                Tämä solmu kasvaa hieman sen mukaan, kuinka paljon ajatusta on jo työstetty.
              </p>
            </div>

            <div className="thought-network-detail-section">
              <p>{selectedNode.preview || "Avaa ajatus nähdäksesi koko sisällön."}</p>
            </div>

            <div className="thought-network-detail-section">
              <div className="thought-network-chip-row">
                <span className="pill">{selectedNode.stageLabel}</span>
                <span className="pill">{selectedNode.hasCards ? "Tehtäviä mukana" : "Ei vielä tehtäviä"}</span>
                <span className="pill">Tallennettu {formatDate(selectedNode.createdAt)}</span>
              </div>
            </div>

            <div className="thought-network-detail-section">
              <h4>Tunnisteet</h4>
              <div className="thought-network-chip-row">
                {selectedNode.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-chip tag-chip-network"
                    onClick={() => setSelectedNodeId(`tag:${normalizeTagValue(tag)}`)}
                  >
                    <span className="tag-chip-mark" aria-hidden="true">#</span>
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="thought-network-detail-actions">
              <Link href={`/sources/${selectedNode.id}`} className="button-link secondary">
                Avaa ajatus
              </Link>
              <Link href={`/sources/${selectedNode.id}`} className="button-link secondary">
                Muokkaa nopeasti
              </Link>
            </div>
          </>
        ) : selectedNode?.type === "tag" ? (
          <>
            <div className="thought-network-detail-header">
              <span className="pill" data-variant="primary">
                Tunniste
              </span>
              <h3>#{selectedNode.label}</h3>
              <p className="muted">
                Tämä tunniste sitoo toisiinsa ajatuksia, jotka kuuluvat samaan aihepiiriin.
              </p>
            </div>

            <div className="thought-network-detail-section">
              <h4>Liittyvät ajatukset</h4>
              <div className="thought-network-related-list">
                {relatedThoughts.map((thought) => (
                  <button
                    key={thought.id}
                    type="button"
                    className="thought-network-related-item"
                    onClick={() => setSelectedNodeId(thought.id)}
                  >
                    <strong>{thought.title}</strong>
                    <span>{thought.stageLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="thought-network-detail-header">
              <span className="pill" data-variant="primary">
                Ajatusverkko
              </span>
              <h3>Valitse ajatus tai tunniste</h3>
              <p className="muted">
                Fokus on tämän MVP:n tärkein ele: yksi ajatus kerrallaan, muu verkko taustalla.
              </p>
            </div>

            <div className="thought-network-detail-section">
              <h4>Mitä tässä voi jo tehdä</h4>
              <ul className="thought-network-note-list">
                <li>Zoomaa ja liikuta verkkoa rauhassa.</li>
                <li>Klikkaa ajatusta nähdäksesi siihen liittyvät tunnisteet.</li>
                <li>Klikkaa tunnistetta nähdäksesi sen ympärille kerääntyvät ajatukset.</li>
              </ul>
            </div>

            <div className="thought-network-detail-actions">
              <Link href="/app" className="button-link secondary">
                Uusi ajatus
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
